/**
 * Servicio de consultas (historial clínico).
 */

import apiClient from '../../api/client'
import type {
  Consulta,
  ConsultaCreate,
  ConsultaCreateConFormula,
  ConsultaParaVenta,
  ResumenConsulta,
  FormulaItem,
  FormulaItemCreate,
} from '../../api/types'

export async function fetchConsultasByMascota(mascotaId: number): Promise<Consulta[]> {
  const { data } = await apiClient.get<Consulta[]>(`/consultas/mascota/${mascotaId}`)
  return data
}

export async function fetchConsultaById(id: number): Promise<Consulta> {
  const { data } = await apiClient.get<Consulta>(`/consultas/${id}`)
  return data
}

export async function fetchConsultasPorCliente(clienteId: number): Promise<ConsultaParaVenta[]> {
  const { data } = await apiClient.get<ConsultaParaVenta[]>(`/consultas/por-cliente/${clienteId}`)
  return data
}

export async function fetchResumenConsulta(consultaId: number): Promise<ResumenConsulta> {
  const { data } = await apiClient.get<ResumenConsulta>(`/consultas/${consultaId}/resumen`)
  return data
}

export async function downloadResumenPdf(consultaId: number): Promise<void> {
  const { data } = await apiClient.get<Blob>(`/consultas/${consultaId}/resumen/pdf`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = `resumen_consulta_${consultaId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export async function enviarResumenEmail(
  consultaId: number,
  toEmail?: string | null
): Promise<void> {
  const body = toEmail && toEmail.trim() ? { to_email: toEmail.trim() } : {}
  await apiClient.post(`/consultas/${consultaId}/enviar-resumen`, body)
}

export async function createConsulta(payload: ConsultaCreate): Promise<Consulta> {
  const { data } = await apiClient.post<Consulta>('/consultas/', payload)
  return data
}

export async function createConsultaConFormula(payload: ConsultaCreateConFormula): Promise<Consulta> {
  const { data } = await apiClient.post<Consulta>('/consultas/crear-con-formula', payload)
  return data
}

export async function fetchFormula(consultaId: number): Promise<FormulaItem[]> {
  const { data } = await apiClient.get<FormulaItem[]>(`/consultas/${consultaId}/formula`)
  return data
}

export async function addFormulaItem(
  consultaId: number,
  payload: FormulaItemCreate
): Promise<FormulaItem> {
  const { data } = await apiClient.post<FormulaItem>(`/consultas/${consultaId}/formula`, payload)
  return data
}

export async function deleteFormulaItem(
  consultaId: number,
  itemId: number
): Promise<void> {
  await apiClient.delete(`/consultas/${consultaId}/formula/${itemId}`)
}

export async function finalizarConsulta(consultaId: number): Promise<void> {
  await apiClient.post(`/consultas/${consultaId}/finalizar`)
}
