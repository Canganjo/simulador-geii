"""
Constrói os modelos 3D dos 7 componentes do simulador, no Blender, a partir de código.

Para cada componente:
  - guarda o ficheiro fonte em assets-src/<tipo>.blend (para abrir e melhorar à mão);
  - exporta o modelo para public/models/<tipo>.glb (o que a aplicação carrega).

Correr (na raiz do repositório):
  blender --background --factory-startup --python assets-src/build_models.py
ou só alguns:
  blender --background --factory-startup --python assets-src/build_models.py -- resistor led

Regras (ver public/models/LEIAME.md):
  - 1 m no Blender = 1 quadrado da grelha; origem no centro do componente, no chão (Z = 0).
  - Dipolos ao longo de X: terminal a (ou +, ou ânodo) em X = -1, b (ou -, ou cátodo) em X = +1.
  - GND: terminal em Y = +1.
  - Material "luz" acende-se; "corpo" recebe a cor do componente; "corpo-luz" faz as duas coisas.
  - <= 2 000 triângulos e <= 200 KB por modelo; exportado em glTF binário, +Y para cima, sem Draco.
"""

import math
import os
import sys

import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLEND_DIR = os.path.join(ROOT, "assets-src")
GLB_DIR = os.path.join(ROOT, "public", "models")

MAX_TRIANGLES = 2000
MAX_BYTES = 200 * 1024

# Altura (Z) das pontas das patas, junto às bolinhas dos terminais da aplicação.
LEAD_Z = 0.03
LEAD_RADIUS = 0.022


# --------------------------------------------------------------------------------------------
# Ferramentas
# --------------------------------------------------------------------------------------------


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def hex_rgba(value, alpha=1.0):
    value = value.lstrip("#")
    srgb = [int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    # Base Color do Principled BSDF está em espaço linear.
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*linear, alpha)


_materials = {}


def material(name, color, metallic=0.0, roughness=0.5, alpha=1.0, emission=0.0):
    """Material Principled BSDF (o único que passa bem para o .glb)."""
    if name in _materials:
        return _materials[name]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = hex_rgba(color)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Alpha"].default_value = alpha
    if emission > 0:
        # Brilho próprio fixo (ex.: o visor da fonte). Não confundir com o material "luz".
        bsdf.inputs["Emission Color"].default_value = hex_rgba(color)
        bsdf.inputs["Emission Strength"].default_value = emission
    if alpha < 1.0:
        # Transparência (vidro da lâmpada, cúpula do LED).
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "BLENDED"
        if hasattr(mat, "blend_method"):
            mat.blend_method = "BLEND"
    mat.diffuse_color = hex_rgba(color, alpha)
    _materials[name] = mat
    return mat


def _finish(obj, mat, smooth=True):
    obj.data.materials.append(mat)
    if smooth:
        for poly in obj.data.polygons:
            poly.use_smooth = True
        # Arestas vivas continuam vivas (tampas dos cilindros, cantos das caixas).
        if hasattr(bpy.ops.object, "shade_smooth_by_angle"):
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    return obj


def cylinder(radius, depth, location, mat, axis="Z", vertices=16):
    rotation = {"X": (0, math.pi / 2, 0), "Y": (math.pi / 2, 0, 0), "Z": (0, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation
    )
    return _finish(bpy.context.active_object, mat)


def sphere(radius, location, mat, scale=(1, 1, 1), segments=16, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=radius, location=location
    )
    obj = bpy.context.active_object
    obj.scale = scale
    return _finish(obj, mat)


def box(size, location, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.scale = size
    return _finish(obj, mat, smooth=False)


def rounded_box(size, location, mat, bevel=0.03):
    """Caixa com as arestas arredondadas (modificador Bevel, aplicado)."""
    obj = box(size, location, mat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = obj.modifiers.new("arredondar", "BEVEL")
    mod.width = bevel
    mod.segments = 2
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    if hasattr(bpy.ops.object, "shade_smooth_by_angle"):
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    return obj


def wire(points, mat, radius=LEAD_RADIUS):
    """Pata metálica: tubo que passa pelos pontos (cantos vivos)."""
    curve = bpy.data.curves.new("pata", type="CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 1  # 8 lados: chega para um fio tão fino
    curve.use_fill_caps = True
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for p, (x, y, z) in zip(spline.points, points):
        p.co = (x, y, z, 1)
    obj = bpy.data.objects.new("pata", curve)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.active_object
    obj.data.materials.append(mat)
    return obj


def lead(x_body, z_body, side, mat, bend_x=0.85):
    """Pata de um dipolo: sai do corpo na horizontal, desce e acaba no terminal (X = ±1)."""
    s = 1 if side > 0 else -1
    return wire(
        [
            (x_body, 0, z_body),
            (s * bend_x, 0, z_body),
            (s * bend_x, 0, LEAD_Z),
            (s * 1.0, 0, LEAD_Z),
        ],
        mat,
    )


def join_all(name):
    """Junta todas as peças num só objeto, com a origem em (0, 0, 0) e transformações aplicadas."""
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    return obj


def triangles(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def metal():
    # Metálico a meio: sem reflexos à volta (a cena não tem mapa de ambiente), um metal "puro"
    # fica quase preto no three.js.
    return material("metal", "#d5dadf", metallic=0.5, roughness=0.35)


# --------------------------------------------------------------------------------------------
# Componentes
# --------------------------------------------------------------------------------------------


def build_resistor():
    """Resistência de 1/4 W: corpo bege com o código de cores de 1 kΩ (castanho, preto, vermelho, ouro)."""
    z = 0.2
    body = material("ceramica", "#dcc49a", roughness=0.55)
    cylinder(0.11, 0.6, (0, 0, z), body, axis="X")
    for x in (-0.3, 0.3):
        sphere(0.15, (x, 0, z), body, scale=(1.2, 1, 1))
    bands = [
        (-0.22, material("castanho", "#6b3a1e", roughness=0.5)),
        (-0.11, material("preto", "#151515", roughness=0.5)),
        (0.0, material("vermelho", "#c0141c", roughness=0.5)),
        (0.2, material("ouro", "#e0b33a", metallic=0.4, roughness=0.35)),
    ]
    for x, mat in bands:
        cylinder(0.133, 0.05, (x, 0, z), mat, axis="X")
    for side in (-1, 1):
        lead(side * 0.47, z, side, metal())


def build_diode():
    """Díodo 1N4007: corpo preto com a risca prateada do lado do cátodo (X = +1)."""
    z = 0.15
    cylinder(0.11, 0.5, (0, 0, z), material("plastico", "#1b1b1b", roughness=0.35), axis="X")
    cylinder(0.115, 0.08, (0.16, 0, z), material("prata", "#e2e2e2", metallic=0.4, roughness=0.3), axis="X")
    for side in (-1, 1):
        lead(side * 0.25, z, side, metal())


def build_led():
    """LED de 5 mm em pé: cúpula translúcida que acende. Ânodo (pata dobrada) em X = -1."""
    dome = material("corpo-luz", "#e11d1d", roughness=0.15, alpha=0.8)
    cylinder(0.29, 0.06, (0, 0, 0.15), dome)  # aba da base
    cylinder(0.25, 0.3, (0, 0, 0.33), dome)  # corpo
    sphere(0.25, (0, 0, 0.48), dome)  # cúpula
    cylinder(0.06, 0.06, (0, 0, 0.36), material("refletor", "#c0c7ce", metallic=0.5, roughness=0.25))
    m = metal()
    # Ânodo (+): a pata mais comprida, com uma dobra (como num LED real).
    wire([(-0.09, 0, 0.36), (-0.09, 0, 0.08), (-0.5, 0, 0.08), (-0.5, 0, LEAD_Z), (-1, 0, LEAD_Z)], m)
    # Cátodo (-): pata direita.
    wire([(0.09, 0, 0.36), (0.09, 0, LEAD_Z), (1, 0, LEAD_Z)], m)


def build_dc_source():
    """Fonte de alimentação de bancada: caixa clara, visor verde e bornes + (vermelho) e - (preto).

    O borne + está do lado X = -1 e o - do lado X = +1 (ordem do catálogo).
    O visor não tem números: o valor real da tensão é mostrado pela aplicação.
    """
    top = 0.5
    rounded_box((1.3, 0.7, top - 0.04), (0, 0, 0.04 + (top - 0.04) / 2), material("caixa", "#d9d4c5", roughness=0.5), bevel=0.04)
    feet = material("borracha", "#1c1c1c", roughness=0.8)
    for x in (-0.5, 0.5):
        for y in (-0.25, 0.25):
            cylinder(0.06, 0.04, (x, y, 0.02), feet, vertices=8)
    # Painel escuro em cima, com o visor verde (ligeiramente luminoso) e dois botões.
    panel = material("painel", "#2a2d33", roughness=0.45)
    rounded_box((1.12, 0.56, 0.02), (0, 0, top + 0.01), panel, bevel=0.01)
    screen = material("visor", "#3ddc63", roughness=0.2, emission=0.6)
    box((0.56, 0.2, 0.02), (0, 0.12, top + 0.025), material("moldura", "#0f1a12", roughness=0.3))
    box((0.5, 0.15, 0.01), (0, 0.12, top + 0.035), screen)
    knob = material("botao", "#4a4f57", roughness=0.4)
    for x in (-0.12, 0.12):
        cylinder(0.07, 0.06, (x, -0.13, top + 0.05), knob, vertices=16)
        box((0.012, 0.06, 0.01), (x, -0.1, top + 0.085), material("marcas", "#f5f5f5"))
    # Bornes: + vermelho do lado X = -1, - preto do lado X = +1.
    m = metal()
    for x, mat in ((-0.42, material("borne-mais", "#d62828", roughness=0.35)), (0.42, material("borne-menos", "#151515", roughness=0.35))):
        cylinder(0.075, 0.1, (x, -0.13, top + 0.07), mat)
        cylinder(0.03, 0.05, (x, -0.13, top + 0.14), m, vertices=8)
        s = -1 if x < 0 else 1
        wire([(x, -0.13, top + 0.15), (s * 0.85, -0.13, top + 0.15), (s * 0.85, -0.13, LEAD_Z), (s * 0.85, 0, LEAD_Z), (s * 1.0, 0, LEAD_Z)], m)


def build_lamp():
    """Lâmpada de casquilho num suporte: o vidro acende ("luz")."""
    wood = material("madeira", "#8a5a3c", roughness=0.6)
    cylinder(0.38, 0.08, (0, 0, 0.04), wood, vertices=32)  # base redonda
    cylinder(0.2, 0.12, (0, 0, 0.14), material("suporte", "#3d3d3d", roughness=0.5))
    m = metal()
    cylinder(0.15, 0.14, (0, 0, 0.27), m)  # rosca
    for z in (0.23, 0.29):
        cylinder(0.158, 0.02, (0, 0, z), m)  # espiras da rosca
    glass = material("luz", "#fff3c4", roughness=0.05, alpha=0.55)
    cylinder(0.13, 0.1, (0, 0, 0.38), glass)  # pescoço
    sphere(0.24, (0, 0, 0.52), glass)  # ampola
    filament = material("filamento", "#7a6450", metallic=0.4, roughness=0.4)
    wire([(-0.05, 0, 0.36), (-0.06, 0, 0.52), (-0.03, 0, 0.56), (0.0, 0, 0.52), (0.03, 0, 0.56), (0.06, 0, 0.52), (0.05, 0, 0.36)], filament, radius=0.008)
    for side in (-1, 1):
        cylinder(0.05, 0.04, (side * 0.3, 0, 0.1), m)  # parafusos dos bornes
        wire([(side * 0.3, 0, 0.05), (side * 0.85, 0, 0.05), (side * 0.85, 0, LEAD_Z), (side * 1.0, 0, LEAD_Z)], m)


def build_switch():
    """Interruptor de alavanca: base, casquilho metálico e alavanca."""
    box((0.8, 0.45, 0.22), (0, 0, 0.11), material("plastico", "#1e3a8a", roughness=0.45))
    m = metal()
    cylinder(0.1, 0.08, (0, 0, 0.26), m)  # casquilho
    cylinder(0.12, 0.02, (0, 0, 0.23), m, vertices=6)  # porca
    tilt = math.radians(25)
    length = 0.3
    cx = math.sin(tilt) * length / 2
    cz = 0.3 + math.cos(tilt) * length / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.035, depth=length, location=(cx, 0, cz), rotation=(0, tilt, 0))
    _finish(bpy.context.active_object, m)
    sphere(0.05, (2 * cx, 0, 0.3 + math.cos(tilt) * length), m, segments=12, rings=6)
    for side in (-1, 1):
        cylinder(0.04, 0.06, (side * 0.3, 0, 0.25), m, vertices=8)  # bornes
        wire([(side * 0.4, 0, 0.06), (side * 0.85, 0, 0.06), (side * 0.85, 0, LEAD_Z), (side * 1.0, 0, LEAD_Z)], m)


def build_ground():
    """Símbolo de massa (GND) em relevo: três barras; o terminal fica em Y = +1."""
    earth = material("terra", "#2f9e44", metallic=0.3, roughness=0.4)
    for y, width in ((0.15, 0.8), (-0.05, 0.52), (-0.25, 0.24)):
        box((width, 0.08, 0.12), (0, y, 0.06), earth)
    wire([(0, 0.19, 0.06), (0, 1.0, LEAD_Z)], metal(), radius=0.03)


BUILDERS = {
    "dc-source": build_dc_source,
    "ground": build_ground,
    "resistor": build_resistor,
    "switch": build_switch,
    "led": build_led,
    "diode": build_diode,
    "lamp": build_lamp,
}


# --------------------------------------------------------------------------------------------
# Exportar
# --------------------------------------------------------------------------------------------


def export(kind):
    reset_scene()
    _materials.clear()
    BUILDERS[kind]()
    obj = join_all(kind)

    tris = triangles(obj)
    lo = [min(v.co[i] for v in obj.data.vertices) for i in range(3)]
    hi = [max(v.co[i] for v in obj.data.vertices) for i in range(3)]

    blend_path = os.path.join(BLEND_DIR, f"{kind}.blend")
    glb_path = os.path.join(GLB_DIR, f"{kind}.glb")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path, compress=True)

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
        export_draco_mesh_compression_enable=False,
    )
    size = os.path.getsize(glb_path)
    ok = tris <= MAX_TRIANGLES and size <= MAX_BYTES and lo[2] >= -1e-6
    print(
        f"[modelo] {kind:10s} {tris:5d} triângulos  {size / 1024:6.1f} KB  "
        f"X {lo[0]:+.2f}..{hi[0]:+.2f}  Y {lo[1]:+.2f}..{hi[1]:+.2f}  Z {lo[2]:+.2f}..{hi[2]:+.2f}  "
        f"{'OK' if ok else 'FORA DOS LIMITES'}"
    )
    return ok


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    kinds = argv or list(BUILDERS)
    results = [export(kind) for kind in kinds]
    if not all(results):
        sys.exit(1)


main()
