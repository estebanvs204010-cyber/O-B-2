// src/data/taller.ts — Datos del taller (edita aquí y se actualiza en TODAS las páginas públicas)

export const TALLER = {
  nombre: 'OptimusByte',
  telefono: '318 509 4430',
  whatsapp: '573185094430',           // formato internacional sin "+" ni espacios
  direccion: 'Carrera 45 # 05 - 13',
  ciudad: 'Bogotá, Colombia',
  correo: 'contacto@optimusbyte.com', // ← cambia por el correo real
  anosExperiencia: 10,                // ← cambia por los años reales
  horario: [
    ['Lunes a viernes', '7:30 am – 5:30 pm'],
    ['Sábados', '8:00 am – 1:00 pm'],
    ['Domingos y festivos', 'Cerrado'],
  ] as [string, string][],
  redes: [
    { nombre: 'Facebook', sigla: 'f', url: '#' },
    { nombre: 'Instagram', sigla: 'ig', url: '#' },
    { nombre: 'TikTok', sigla: 'tt', url: '#' },
  ],
};

export const NAV = [
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/reservas', label: 'Reservas' },
  { href: '/repuestos', label: 'Repuestos' },
  { href: '/contacto', label: 'Contacto' },
  { href: '/blog', label: 'Blog' },
];

export const servicios = [
  {
    slug: 'mecanica-general',
    icono: 'wrench',
    titulo: 'Mecánica general',
    texto: 'Mantenimiento preventivo y correctivo para todas las marcas: aceite, frenos, suspensión y más.',
    items: ['Cambio de aceite y filtros', 'Frenos y suspensión', 'Sincronización y afinación', 'Revisión de sistema eléctrico básico'],
  },
  {
    slug: 'diagnostico',
    icono: 'search',
    titulo: 'Diagnóstico electrónico',
    texto: 'Escáner de última generación para detectar fallas con precisión antes de reparar.',
    items: ['Lectura y borrado de códigos de falla', 'Revisión de sensores y módulos', 'Diagnóstico de luces del tablero', 'Informe claro del estado del vehículo'],
  },
  {
    slug: 'latoneria-pintura',
    icono: 'car',
    titulo: 'Latonería y pintura',
    texto: 'Reparación de colisión y acabados de pintura para que tu vehículo quede como nuevo.',
    items: ['Reparación de golpes y colisión', 'Pintura completa y por partes', 'Pulida y brillado', 'Restauración de piezas plásticas'],
  },
  {
    slug: 'especializada',
    icono: 'gear',
    titulo: 'Mecánica especializada',
    texto: 'Motor, transmisión y sistemas complejos atendidos por técnicos con experiencia.',
    items: ['Reparación de motor', 'Caja de cambios y embrague', 'Sistemas de inyección', 'Aire acondicionado'],
  },
  {
    slug: 'alineacion',
    icono: 'target',
    titulo: 'Alineación y balanceo',
    texto: 'Mejora la estabilidad y alarga la vida de tus llantas con una dirección bien calibrada.',
    items: ['Alineación computarizada', 'Balanceo de ruedas', 'Rotación de llantas', 'Revisión de dirección'],
  },
  {
    slug: 'mantenimiento',
    icono: 'toolbox',
    titulo: 'Mantenimiento programado',
    texto: 'Agenda los mantenimientos de tu vehículo y recibe seguimiento desde tu área de cliente.',
    items: ['Plan por kilometraje', 'Historial por vehículo', 'Recordatorios de próximos servicios', 'Revisión de 30 puntos'],
  },
];

export const pasos = [
  { titulo: 'Solicita tu cotización', texto: 'Cuéntanos qué necesita tu vehículo por WhatsApp o desde el formulario y te respondemos rápido.' },
  { titulo: 'Trae tu vehículo', texto: 'Agenda tu cita, recíbelo con su orden de trabajo y registra tu vehículo en nuestro sistema.' },
  { titulo: 'Sigue y recoge', texto: 'Consulta el estado de tu orden en tiempo real desde tu área de cliente y recógelo listo.' },
];

export const repuestos = [
  { icono: 'package', nombre: 'Accesorios', texto: 'Tapetes, forros, luces auxiliares, sensores y más.' },
  { icono: 'car', nombre: 'Carrocería', texto: 'Parachoques, farolas, espejos, capós y guardabarros.' },
  { icono: 'steering', nombre: 'Dirección', texto: 'Cremalleras, rótulas, terminales y bombas.' },
  { icono: 'brake', nombre: 'Frenos', texto: 'Pastillas, discos, bandas, cilindros y líquido.' },
  { icono: 'engine', nombre: 'Motor', texto: 'Filtros, bujías, correas, empaques y sensores.' },
  { icono: 'spring', nombre: 'Suspensión', texto: 'Amortiguadores, resortes, bujes y brazos.' },
];

// Precios de ejemplo: reemplázalos por los reales
export const promos = [
  { etiqueta: 'Seguridad', titulo: 'Revisión de frenos', texto: 'Inspección de pastillas, discos, líquido y sistema hidráulico.', precio: '$59.000' },
  { etiqueta: 'Confort', titulo: 'Revisión de suspensión', texto: 'Amortiguadores, resortes, rótulas y terminales revisados a fondo.', precio: '$69.000' },
  { etiqueta: 'Viaje', titulo: 'Revisión de viaje', texto: 'Chequeo de 30 puntos para salir tranquilo a carretera.', precio: '$89.000' },
];

// Artículos de ejemplo para el blog: reemplázalos por los tuyos
export const articulos = [
  { slug: 'cada-cuanto-cambiar-aceite', icono: 'droplet', categoria: 'Mantenimiento', fecha: '2026-09-28', titulo: '¿Cada cuánto debo cambiar el aceite de mi carro?', resumen: 'El kilometraje ideal depende del tipo de aceite y de cómo manejas. Te explicamos cómo saberlo.' },
  { slug: 'senales-frenos-gastados', icono: 'brake', categoria: 'Seguridad', fecha: '2026-09-15', titulo: '5 señales de que tus frenos necesitan revisión', resumen: 'Ruidos, vibraciones y pedal blando: lo que no debes ignorar antes de un accidente.' },
  { slug: 'revision-antes-de-viajar', icono: 'compass', categoria: 'Viajes', fecha: '2026-08-30', titulo: 'Checklist antes de salir a carretera', resumen: 'Llantas, líquidos, luces y frenos: lo mínimo que debes revisar antes de viajar.' },
  { slug: 'luces-del-tablero', icono: 'bulb', categoria: 'Diagnóstico', fecha: '2026-08-12', titulo: 'Qué significan las luces del tablero', resumen: 'Guía rápida para distinguir una alerta pasajera de una falla que requiere taller.' },
  { slug: 'alineacion-y-balanceo', icono: 'target', categoria: 'Llantas', fecha: '2026-07-25', titulo: 'Alineación y balanceo: no son lo mismo', resumen: 'Cuándo hacer cada uno y cómo ahorrar dinero en llantas.' },
  { slug: 'cuidar-la-pintura', icono: 'palette', categoria: 'Latonería y pintura', fecha: '2026-07-08', titulo: 'Cómo cuidar la pintura de tu vehículo', resumen: 'Hábitos simples para que el brillo dure años y no pierdas valor de reventa.' },
];

export const iconoWhatsApp =
  'M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z';
