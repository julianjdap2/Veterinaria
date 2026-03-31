/**
 * Catálogos para multiselect (servicios / especialidades).
 * Valores almacenados como string en usuario.extendido; la UI puede ampliarlos sin migración.
 */

export const SERVICIOS_AGENDA_OPCIONES: { value: string; label: string }[] = [
  { value: 'consulta_general', label: 'Consulta general' },
  { value: 'consulta_especializada', label: 'Consulta especializada' },
  { value: 'cirugia', label: 'Cirugía' },
  { value: 'cirugia_laser', label: 'Cirugía láser' },
  { value: 'cirugia_tejidos_blandos', label: 'Cirugía tejidos blandos' },
  { value: 'consulta_domicilio', label: 'Consulta en casa' },
  { value: 'consulta_no_programada', label: 'Consulta no programada' },
  { value: 'consulta_preanestesica', label: 'Consulta preanestésica' },
  { value: 'consulta_prequirurgica', label: 'Consulta prequirúrgica' },
  { value: 'urgencias', label: 'Urgencias / cuidados críticos' },
  { value: 'dermatologia', label: 'Dermatología' },
  { value: 'cardiologia', label: 'Cardiología' },
  { value: 'odontologia', label: 'Odontología' },
  { value: 'imagenologia', label: 'Imagenología' },
  { value: 'fisioterapia', label: 'Fisioterapia' },
  { value: 'peluqueria_spa', label: 'Peluquería y spa' },
  { value: 'vacunacion', label: 'Vacunación' },
  { value: 'desparasitacion', label: 'Desparasitación' },
]

export const ESPECIALIDADES_VETERINARIAS: { value: string; label: string }[] = [
  { value: 'cirugia', label: 'Cirugía' },
  { value: 'medicina_general', label: 'Medicina general' },
  { value: 'dermatologia', label: 'Dermatología' },
  { value: 'cardiologia', label: 'Cardiología' },
  { value: 'neurologia', label: 'Neurología' },
  { value: 'oncologia', label: 'Oncología' },
  { value: 'nutricion', label: 'Nutrición' },
  { value: 'imagenologia', label: 'Imagenología' },
  { value: 'oftalmologia', label: 'Oftalmología' },
  { value: 'traumatologia', label: 'Traumatología / ortopedia' },
  { value: 'odontologia', label: 'Odontología' },
  { value: 'fisioterapia', label: 'Fisioterapia' },
  { value: 'gastroenterologia', label: 'Gastroenterología' },
  { value: 'endocrinologia', label: 'Endocrinología' },
  { value: 'anestesiologia', label: 'Anestesiología' },
]
