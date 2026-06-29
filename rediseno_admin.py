#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# rediseno_admin.py
# Aplica el mismo rediseño (categorías plegables) a la pantalla del ADMINISTRADOR.
# Respeta los módulos exactos de esa pantalla. NO toca nada de la operación del día.
# Crea respaldo .bak. Es idempotente.

import sys, os, shutil, datetime

ruta = 'src/components/admin/VistaAdministrador.jsx'

if not os.path.exists(ruta):
    print('❌ No encuentro', ruta, '— ¿estás en la carpeta del proyecto?')
    sys.exit(1)

with open(ruta, encoding='utf-8') as f:
    c = f.read()

if "from '../../ui/piezas'" in c:
    print('⚠️ Ya parece aplicado. No toco nada.')
    sys.exit(0)

imp   = "import { supabase } from '../../supabaseClient'"
start = "{/* MÓDULOS - 4 CATEGORÍAS */}"
end   = "{/* MIS COSAS (si aplica) */}"

faltan = [a for a in [imp, start, end] if a not in c]
if faltan:
    print('❌ No encontré estas anclas; no toco el archivo:')
    for a in faltan: print('   -', a)
    sys.exit(1)

bak = ruta + '.bak'
if os.path.exists(bak):
    bak = ruta + '.bak-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
shutil.copy2(ruta, bak)

c = c.replace(imp, imp + "\nimport { TarjetaModulo, SeccionCategoria } from '../../ui/piezas'", 1)

nuevo = """{/* MÓDULOS — categorías plegables (rediseño) */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <span style={{ fontSize: '14px' }}>📂</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600 }}>
            MÓDULOS
          </span>
        </div>

        <SeccionCategoria label={CATEGORIAS.finanzas.label} sublabel={CATEGORIAS.finanzas.sublabel} color={CATEGORIAS.finanzas.color} abiertaInicial={true}>
          <TarjetaModulo icono="🧾" label="Factura INABIE" sublabel="Facturas mensuales" color={CATEGORIAS.finanzas.color} onClick={onIrFactura ? onIrFactura : () => mostrarProximamente('Factura INABIE')} />
          <TarjetaModulo icono="🚚" label="Conduces" sublabel="Mes en curso" color={CATEGORIAS.finanzas.color} onClick={onIrConduces ? onIrConduces : () => mostrarProximamente('Conduces')} />
          <TarjetaModulo icono="💸" label="Gastos" sublabel="Categorías + RNC" color={CATEGORIAS.finanzas.color} onClick={onIrGastos ? onIrGastos : () => mostrarProximamente('Gastos')} />
          <TarjetaModulo icono="📊" label="Reportes DGII" sublabel="606 · 607 · pronto" color={CATEGORIAS.finanzas.color} onClick={() => mostrarProximamente('Reportes DGII 606/607')} />
        </SeccionCategoria>

        <SeccionCategoria label={CATEGORIAS.inventario.label} sublabel={CATEGORIAS.inventario.sublabel} color={CATEGORIAS.inventario.color}>
          <TarjetaModulo icono="🥕" label="Ingredientes" sublabel="Catálogo" color={CATEGORIAS.inventario.color} onClick={onIrIngredientes ? onIrIngredientes : () => mostrarProximamente('Ingredientes')} />
          <TarjetaModulo icono="🛒" label="Compras" sublabel="Esta semana" color={CATEGORIAS.inventario.color} onClick={onIrCompras ? onIrCompras : () => mostrarProximamente('Compras')} />
          <TarjetaModulo icono="🏪" label="Proveedores" sublabel="Con RNC" color={CATEGORIAS.inventario.color} onClick={onIrProveedores ? onIrProveedores : () => mostrarProximamente('Proveedores')} />
          <TarjetaModulo icono="👨‍🍳" label="Recetas" sublabel="Catálogo" color={CATEGORIAS.inventario.color} onClick={onIrCatalogo ? onIrCatalogo : () => mostrarProximamente('Recetas')} />
        </SeccionCategoria>

        <SeccionCategoria label={CATEGORIAS.personal.label} sublabel={CATEGORIAS.personal.sublabel} color={CATEGORIAS.personal.color}>
          <TarjetaModulo icono="👤" label="Empleados" sublabel="Equipo" color={CATEGORIAS.personal.color} onClick={onIrEmpleados ? onIrEmpleados : () => mostrarProximamente('Empleados')} />
          <TarjetaModulo icono="🕐" label="Asistencia" sublabel="Quién vino" color={CATEGORIAS.personal.color} onClick={onIrAsistencia ? onIrAsistencia : () => mostrarProximamente('Asistencia')} />
          <TarjetaModulo icono="💵" label="Nómina" sublabel="Pagos" color={CATEGORIAS.personal.color} onClick={onIrNomina ? onIrNomina : () => mostrarProximamente('Nómina')} />
          <TarjetaModulo icono="📄" label="Contratos" sublabel="Por empleado" color={CATEGORIAS.personal.color} onClick={onIrContratos ? onIrContratos : () => mostrarProximamente('Contratos')} />
          <TarjetaModulo icono="🧮" label="Calculadora" sublabel="Liquidación" color={CATEGORIAS.personal.color} onClick={onIrCalculadora ? onIrCalculadora : () => mostrarProximamente('Calculadora')} />
        </SeccionCategoria>

        <SeccionCategoria label={CATEGORIAS.operacion.label} sublabel={CATEGORIAS.operacion.sublabel} color={CATEGORIAS.operacion.color}>
          <TarjetaModulo icono="🚚" label="Modo Despacho" sublabel="Operación" color={CATEGORIAS.operacion.color} onClick={onIrDespacho ? onIrDespacho : () => mostrarProximamente('Modo Despacho')} />
          <TarjetaModulo icono="💡" label="Inteligencia" sublabel="Análisis" color={CATEGORIAS.operacion.color} onClick={onIrInteligencia ? onIrInteligencia : () => mostrarProximamente('Inteligencia')} />
          <TarjetaModulo icono="📊" label="Estadísticas" sublabel="En qué pie" color={CATEGORIAS.operacion.color} onClick={onIrEstadisticas ? onIrEstadisticas : () => mostrarProximamente('Estadísticas')} />
          <TarjetaModulo icono="📜" label="Historial" sublabel="Todas ops" color={CATEGORIAS.operacion.color} onClick={onIrHistorial ? onIrHistorial : () => mostrarProximamente('Historial')} />
          <TarjetaModulo icono="⚙️" label="Configuración" sublabel={onIrConfiguracion ? "Empresa" : "Solo propietario"} color={CATEGORIAS.operacion.color} onClick={onIrConfiguracion ? onIrConfiguracion : () => mostrarProximamente('Configuración (solo propietario)')} />
        </SeccionCategoria>
      </div>

      """

i = c.index(start)
j = c.index(end)
c = c[:i] + nuevo + c[j:]

with open(ruta, 'w', encoding='utf-8') as f:
    f.write(c)

print('✅ Listo. Pantalla del Administrador con categorías plegables.')
print('   Respaldo guardado en:', bak)