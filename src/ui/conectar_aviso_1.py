#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# conectar_aviso_1.py
# DEMO: conecta el PRIMER aviso bonito (validación de "Sin clase") en la pantalla
# del Propietario, para que lo veas funcionando. Crea respaldo .bak. Idempotente.

import os, shutil, datetime, sys

ruta = 'src/components/dashboard/DashboardDelDia.jsx'
if not os.path.exists(ruta):
    print('❌ No encuentro', ruta, '— ¿estás en la carpeta del proyecto?'); sys.exit(1)

with open(ruta, encoding='utf-8') as f:
    c = f.read()

if "from '../../ui/avisos'" in c:
    print('⚠️ Ya parece conectado. No toco nada.'); sys.exit(0)

anclas = [
    "import ModalPesajeCrudo from '../pesaje/ModalPesajeCrudo'",
    "  const [modalSinClase, setModalSinClase] = useState(null)",
    "      alert('Por favor indica la razón por la cual no hay clase')",
    "      {modalSinClase && (",
]
faltan = [a for a in anclas if a not in c]
if faltan:
    print('❌ No encontré estas anclas; no toco nada:')
    for a in faltan: print('   -', a[:50])
    sys.exit(1)

bak = ruta + '.bak'
if os.path.exists(bak):
    bak = ruta + '.bak-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
shutil.copy2(ruta, bak)

c = c.replace(
    "import ModalPesajeCrudo from '../pesaje/ModalPesajeCrudo'",
    "import ModalPesajeCrudo from '../pesaje/ModalPesajeCrudo'\nimport { ModalAviso } from '../../ui/avisos'", 1)

c = c.replace(
    "  const [modalSinClase, setModalSinClase] = useState(null)",
    "  const [modalSinClase, setModalSinClase] = useState(null)\n  const [aviso, setAviso] = useState(null)", 1)

c = c.replace(
    "      alert('Por favor indica la razón por la cual no hay clase')",
    "      setAviso({ tipo: 'advertencia', mensaje: 'Por favor indica la razón por la cual no hay clase' })", 1)

c = c.replace(
    "      {modalSinClase && (",
    "      {aviso && <ModalAviso {...aviso} onCerrar={() => setAviso(null)} />}\n\n      {modalSinClase && (", 1)

with open(ruta, 'w', encoding='utf-8') as f:
    f.write(c)

print('✅ Listo. Primer aviso bonito conectado (validación de "Sin clase").')
print('   Respaldo en:', bak)