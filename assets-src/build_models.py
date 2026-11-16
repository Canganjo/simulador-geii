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
    z = 0.24
    body = material("ceramica", "#e6d3a8", roughness=0.55)
    cylinder(0.11, 0.6, (0, 0, z), body, axis="X", vertices=24)
    for x in (-0.3, 0.3):
        sphere(0.15, (x, 0, z), body, scale=(1.2, 1, 1), segments=24, rings=12)
    bands = [
        (-0.22, material("castanho", "#6b3a1e", roughness=0.5)),
        (-0.11, material("preto", "#151515", roughness=0.5)),
        (0.0, material("vermelho", "#c0141c", roughness=0.5)),
        (0.2, material("ouro", "#e0b33a", metallic=0.4, roughness=0.35)),
    ]
    for x, mat in bands:
        cylinder(0.133, 0.05, (x, 0, z), mat, axis="X", vertices=24)
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
    """LED vermelho de 5 mm, em pé sobre as patas (como no mockup): aba, corpo e cúpula translúcidos.

    Material "corpo-luz": recebe a cor escolhida no painel e acende-se. Ânodo (pata mais comprida,
    com uma dobra) em X = -1; cátodo em X = +1.
    """
    shell = material("corpo-luz", "#e3171b", roughness=0.12, alpha=0.88)
    base_z = 0.3  # o LED fica levantado sobre as patas
    cylinder(0.2, 0.045, (0, 0, base_z + 0.0225), shell, vertices=24)  # aba
    cylinder(0.17, 0.26, (0, 0, base_z + 0.045 + 0.13), shell, vertices=24)  # corpo
    sphere(0.17, (0, 0, base_z + 0.305), shell, scale=(1, 1, 1.05), segments=24, rings=10)  # cúpula
    # Por dentro: os dois suportes metálicos (bigorna e poste), como num LED real.
    inner = material("interior", "#b8bec6", metallic=0.5, roughness=0.3)
    box((0.07, 0.025, 0.2), (0.05, 0, base_z + 0.16), inner)
    box((0.04, 0.025, 0.24), (-0.05, 0, base_z + 0.18), inner)
    m = metal()
    wire([(-0.05, 0, base_z + 0.05), (-0.05, 0, 0.12), (-0.35, 0, 0.12), (-0.35, 0, LEAD_Z), (-1, 0, LEAD_Z)], m)
    wire([(0.05, 0, base_z + 0.05), (0.05, 0, LEAD_Z), (1, 0, LEAD_Z)], m)


def build_dc_source():
    """Fonte de alimentação de bancada (como no mockup): caixa creme, frente escura virada para a
    câmara (-Y) com o visor verde e os bornes + (vermelho) e - (preto).

    O visor é um retângulo com o material "visor": a aplicação escreve lá a tensão real (ex.: 12.0 V).
    Borne + do lado X = -1, borne - do lado X = +1 (ordem do catálogo).
    """
    w, d, h = 1.3, 0.56, 0.62
    case = material("caixa", "#e4dccb", roughness=0.45)
    rounded_box((w, d, h - 0.04), (0, 0, 0.04 + (h - 0.04) / 2), case, bevel=0.05)
    feet = material("borracha", "#1c1c1c", roughness=0.8)
    for x in (-0.52, 0.52):
        for y in (-0.22, 0.22):
            cylinder(0.05, 0.04, (x, y, 0.02), feet, vertices=8)
    front = -d / 2
    panel = material("painel", "#2b2f36", roughness=0.4)
    rounded_box((w - 0.12, 0.02, h - 0.14), (0, front - 0.005, 0.04 + (h - 0.04) / 2), panel, bevel=0.01)
    # Visor: moldura preta + ecrã verde (plano com UV 0..1, virado para -Y).
    box((0.66, 0.02, 0.24), (0, front - 0.02, 0.46), material("moldura", "#0c120e", roughness=0.3))
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, front - 0.031, 0.46), rotation=(math.pi / 2, 0, 0))
    screen = bpy.context.active_object
    screen.scale = (0.6, 0.19, 1)
    screen.data.materials.append(material("visor", "#0b2e15", roughness=0.25, emission=0.4))
    # Botões de ajuste (tensão e corrente).
    knob = material("botao", "#3d424a", roughness=0.35)
    mark = material("marcas", "#f5f5f5")
    for x in (-0.12, 0.12):
        cylinder(0.07, 0.06, (x, front - 0.04, 0.2), knob, axis="Y", vertices=16)
        box((0.012, 0.01, 0.05), (x, front - 0.075, 0.23), mark)
    # Bornes à frente: + vermelho (X = -1), - preto (X = +1).
    m = metal()
    for x, mat in ((-0.45, material("borne-mais", "#d62828", roughness=0.3)), (0.45, material("borne-menos", "#141414", roughness=0.3))):
        cylinder(0.07, 0.08, (x, front - 0.05, 0.2), mat, axis="Y", vertices=16)
        cylinder(0.028, 0.04, (x, front - 0.09, 0.2), m, axis="Y", vertices=8)
        s = -1 if x < 0 else 1
        # Patas dentro do limite de 0,4 à frente (|Y| <= 0,4).
        wire([(x, -0.36, 0.2), (x, -0.36, LEAD_Z), (s * 0.85, -0.36, LEAD_Z), (s * 0.85, 0, LEAD_Z), (s * 1.0, 0, LEAD_Z)], m)


def build_lamp():
    """Lâmpada (como no mockup): base redonda de madeira, casquilho de latão, ampola de vidro e
    filamento. O vidro ("luz") e o filamento ("luz.001") acendem-se quando a lâmpada funciona."""
    wood = material("madeira", "#7a4b2e", roughness=0.55)
    cylinder(0.38, 0.07, (0, 0, 0.035), wood, vertices=32)
    cylinder(0.3, 0.03, (0, 0, 0.085), material("madeira-clara", "#94603d", roughness=0.5), vertices=32)
    cylinder(0.17, 0.1, (0, 0, 0.15), material("porcelana", "#ece8e0", roughness=0.4), vertices=24)
    brass = material("latao", "#c9a24b", metallic=0.5, roughness=0.3)
    cylinder(0.13, 0.12, (0, 0, 0.26), brass, vertices=20)
    for z in (0.22, 0.26, 0.3):
        cylinder(0.137, 0.018, (0, 0, z), brass, vertices=20)  # espiras da rosca
    glass = material("luz", "#fff7dd", roughness=0.05, alpha=0.35)
    cylinder(0.11, 0.08, (0, 0, 0.36), glass, vertices=20)  # pescoço
    sphere(0.25, (0, 0, 0.53), glass, scale=(1, 1, 1.0), segments=24, rings=12)  # ampola
    filament = material("luz.001", "#ffb347", metallic=0.2, roughness=0.4)
    support = material("suporte", "#9aa3ad", metallic=0.5, roughness=0.3)
    wire([(-0.04, 0, 0.36), (-0.07, 0, 0.55)], support, radius=0.008)
    wire([(0.04, 0, 0.36), (0.07, 0, 0.55)], support, radius=0.008)
    wire([(-0.07, 0, 0.55), (-0.045, 0, 0.6), (-0.02, 0, 0.55), (0.0, 0, 0.6), (0.02, 0, 0.55), (0.045, 0, 0.6), (0.07, 0, 0.55)], filament, radius=0.012)
    m = metal()
    for side in (-1, 1):
        cylinder(0.04, 0.04, (side * 0.3, 0, 0.12), m, vertices=8)  # parafusos dos bornes
        wire([(side * 0.3, 0, 0.1), (side * 0.3, 0, 0.05), (side * 0.85, 0, 0.05), (side * 0.85, 0, LEAD_Z), (side * 1.0, 0, LEAD_Z)], m)


def build_switch(closed=True):
    """Interruptor de alavanca: base, casquilho metálico e alavanca.

    Há dois modelos: switch.glb (FECHADO: alavanca para a direita, sinal verde) e
    switch-open.glb (ABERTO: alavanca para a esquerda, sinal vermelho). A cena troca-os
    conforme o parâmetro `closed`.
    """
    box((0.8, 0.45, 0.22), (0, 0, 0.11), material("plastico", "#1e3a8a", roughness=0.45))
    m = metal()
    cylinder(0.1, 0.08, (0, 0, 0.26), m)  # casquilho
    cylinder(0.12, 0.02, (0, 0, 0.23), m, vertices=6)  # porca
    tilt = math.radians(35 if closed else -35)
    length = 0.3
    cx = math.sin(tilt) * length / 2
    cz = 0.3 + math.cos(tilt) * length / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.035, depth=length, location=(cx, 0, cz), rotation=(0, tilt, 0))
    _finish(bpy.context.active_object, m)
    sphere(0.05, (2 * cx, 0, 0.3 + math.cos(tilt) * length), m, segments=12, rings=6)
    # Sinal do estado em cima da base (vê-se com qualquer rotação) (verde = fechado / passa corrente; vermelho = aberto).
    color = "#22c55e" if closed else "#ef4444"
    signal = material("estado", color, roughness=0.4, emission=0.8)
    box((0.12, 0.12, 0.02), (-0.27, -0.12, 0.225), signal)
    box((0.12, 0.12, 0.02), (0.27, 0.12, 0.225), signal)
    for side in (-1, 1):
        cylinder(0.04, 0.06, (side * 0.3, 0, 0.25), m, vertices=8)  # bornes
        wire([(side * 0.4, 0, 0.06), (side * 0.85, 0, 0.06), (side * 0.85, 0, LEAD_Z), (side * 1.0, 0, LEAD_Z)], m)


def build_capacitor():
    """Condensador eletrolítico em pé: lata azul, tampa de alumínio com a cruz de segurança e a
    risca branca do lado do terminal b (X = +1). As patas saem por baixo e vão pelo chão."""
    can = material("lata", "#1d4ed8", roughness=0.35)
    cylinder(0.22, 0.5, (0, 0, 0.3), can, vertices=24)
    alu = material("aluminio", "#c9ced6", metallic=0.5, roughness=0.3)
    cylinder(0.205, 0.02, (0, 0, 0.56), alu, vertices=24)  # tampa
    groove = material("ranhura", "#7c838d", metallic=0.4, roughness=0.4)
    box((0.3, 0.025, 0.012), (0, 0, 0.572), groove)  # cruz de segurança
    box((0.025, 0.3, 0.012), (0, 0, 0.572), groove)
    stripe = material("risca", "#e5e7eb", roughness=0.4)
    box((0.06, 0.2, 0.42), (0.205, 0, 0.3), stripe)  # risca do lado b
    cylinder(0.2, 0.05, (0, 0, 0.05), material("base", "#111827", roughness=0.6), vertices=24)
    m = metal()
    for side in (-1, 1):
        wire([(side * 0.09, 0, 0.06), (side * 0.09, 0, LEAD_Z), (side * 1.0, 0, LEAD_Z)], m)


def build_inductor():
    """Bobina: fio de cobre enrolado num núcleo de ferrite (axial, ao longo de X)."""
    z = 0.22
    core = material("ferrite", "#3b3f46", roughness=0.7)
    cylinder(0.09, 0.72, (0, 0, z), core, axis="X", vertices=16)
    for x in (-0.38, 0.38):
        cylinder(0.17, 0.04, (x, 0, z), core, axis="X", vertices=16)  # abas do carreto
    copper = material("cobre", "#c8742f", metallic=0.6, roughness=0.3)
    turns, per_turn, radius = 7, 10, 0.125
    points = []
    for i in range(turns * per_turn + 1):
        a = 2 * math.pi * i / per_turn
        x = -0.32 + 0.64 * i / (turns * per_turn)
        points.append((x, radius * math.sin(a), z + radius * math.cos(a)))
    wire(points, copper, radius=0.028)
    for side in (-1, 1):
        lead(side * 0.4, z, side, copper)


def build_meter(unit):
    """Multímetro de bancada pequeno (voltímetro "V" ou amperímetro "A"): capa de borracha amarela,
    frente escura virada para a câmara (-Y) com o visor verde, o comutador e os bornes.

    O visor usa o material "visor": a aplicação escreve lá a leitura depois de Simular (ex.: 8.00 V).
    Borne + (vermelho) do lado X = -1, borne - (preto, COM) do lado X = +1 (ordem do catálogo).
    """
    w, d, h = 0.9, 0.42, 0.78
    holster = material("capa", "#f2c230", roughness=0.7)
    rounded_box((w, d, h), (0, 0, h / 2), holster, bevel=0.07)
    front = -d / 2
    panel = material("painel", "#24282e", roughness=0.4)
    rounded_box((w - 0.14, 0.02, h - 0.14), (0, front - 0.005, h / 2), panel, bevel=0.015)
    # Visor: moldura + ecrã verde (plano com UV 0..1, virado para -Y).
    box((0.62, 0.02, 0.2), (0, front - 0.02, 0.58), material("moldura", "#0c120e", roughness=0.3))
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, front - 0.031, 0.58), rotation=(math.pi / 2, 0, 0))
    screen = bpy.context.active_object
    screen.scale = (0.56, 0.16, 1)
    screen.data.materials.append(material("visor", "#0b2e15", roughness=0.25, emission=0.4))
    # Comutador rotativo com a marca a apontar para a grandeza medida (V à esquerda, A à direita).
    knob = material("comutador", "#3d424a", roughness=0.35)
    cylinder(0.12, 0.05, (0, front - 0.035, 0.32), knob, axis="Y", vertices=20)
    mark = material("marcas", "#f5f5f5")
    angle = math.radians(40 if unit == "V" else -40)
    box((0.02, 0.01, 0.09), (-math.sin(angle) * 0.06, front - 0.065, 0.32 + math.cos(angle) * 0.06), mark, rotation=(0, angle, 0))
    # Letra da grandeza (V ou A) por cima do comutador.
    bpy.ops.object.text_add(location=(0, front - 0.022, 0.44), rotation=(math.pi / 2, 0, 0))
    text = bpy.context.active_object
    text.data.body = unit
    text.data.size = 0.11
    text.data.align_x = "CENTER"
    text.data.align_y = "CENTER"
    text.data.extrude = 0.004
    text.data.resolution_u = 2
    bpy.ops.object.convert(target="MESH")
    text = bpy.context.active_object
    text.data.materials.append(mark)
    # Bornes em baixo: + vermelho (X = -1), - preto (X = +1).
    m = metal()
    for x, mat in ((-0.27, material("borne-mais", "#d62828", roughness=0.3)), (0.27, material("borne-menos", "#141414", roughness=0.3))):
        cylinder(0.06, 0.07, (x, front - 0.04, 0.14), mat, axis="Y", vertices=16)
        cylinder(0.024, 0.04, (x, front - 0.08, 0.14), m, axis="Y", vertices=8)
        s = -1 if x < 0 else 1
        # Patas dentro do limite de 0,4 à frente (|Y| <= 0,4).
        wire([(x, -0.34, 0.14), (x, -0.34, LEAD_Z), (s * 0.85, -0.34, LEAD_Z), (s * 0.85, 0, LEAD_Z), (s * 1.0, 0, LEAD_Z)], m)


def build_ground():
    """Símbolo de massa (GND) em metal, como no mockup: três barras numa placa; terminal em Y = +1."""
    plate = material("placa", "#3a3f47", roughness=0.6)
    box((0.86, 0.6, 0.03), (0, -0.05, 0.015), plate)
    steel = material("aco", "#aab2bb", metallic=0.5, roughness=0.3)
    for y, width in ((0.15, 0.76), (-0.05, 0.5), (-0.25, 0.24)):
        box((width, 0.07, 0.1), (0, y, 0.08), steel)
    box((0.06, 0.4, 0.06), (0, 0.38, 0.06), steel)  # haste até ao terminal
    wire([(0, 0.55, 0.06), (0, 1.0, LEAD_Z)], metal(), radius=0.03)


BUILDERS = {
    "dc-source": build_dc_source,
    "ground": build_ground,
    "resistor": build_resistor,
    "switch": build_switch,
    "switch-open": lambda: build_switch(closed=False),
    "led": build_led,
    "diode": build_diode,
    "lamp": build_lamp,
    "capacitor": build_capacitor,
    "inductor": build_inductor,
    "voltmeter": lambda: build_meter("V"),
    "ammeter": lambda: build_meter("A"),
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
