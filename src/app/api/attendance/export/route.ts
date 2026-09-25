import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import ExcelJS from 'exceljs'

const ATTENDANCE_EXPORT_ROW_LIMIT = 1000
const MAX_EXPORT_SIGNATURE_LENGTH = 500000

export async function GET(request: Request) {
  try {
    // Auth guard — admin only
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const idsParam = url.searchParams.get('ids')
    let whereClause = {}
    if (idsParam) {
      const ids = idsParam.split(',').map((v) => Number(v.trim())).filter((v) => !isNaN(v))
      if (ids.length > 0) {
        whereClause = { id: { in: ids } }
      }
    }

    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      take: ATTENDANCE_EXPORT_ROW_LIMIT + 1,
      select: {
        id: true,
        namaLengkap: true,
        nipNrp: true,
        jabatan: true,
        unitKerja: true,
        sebagai: true,
        signature: true,
        createdAt: true,
      },
    })

    if (attendances.length > ATTENDANCE_EXPORT_ROW_LIMIT) {
      return NextResponse.json(
        { error: `Export maksimal ${ATTENDANCE_EXPORT_ROW_LIMIT} baris. Gunakan filter atau ekspor bertahap.` },
        { status: 413 }
      )
    }

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Daftar Hadir'
    workbook.created = new Date()

    const sheet = workbook.addWorksheet('Daftar Hadir')

    sheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Nama Lengkap', key: 'nama', width: 30 },
      { header: 'NIP/NRP', key: 'nipNrp', width: 22 },
      { header: 'Jabatan', key: 'jabatan', width: 30 },
      { header: 'Unit Kerja', key: 'unitKerja', width: 30 },
      { header: 'Sebagai', key: 'sebagai', width: 15 },
      { header: 'Tanda Tangan', key: 'signature', width: 20 },
      { header: 'Waktu Hadir', key: 'waktu', width: 22 },
    ]

    // Style header row
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1a365d' },
    }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    headerRow.height = 28

    // Data rows with signature images
    attendances.forEach((att: {
      id: number
      namaLengkap: string
      nipNrp: string
      jabatan: string
      unitKerja: string
      sebagai: string
      signature: string
      createdAt: Date
    }, index: number) => {
      const rowNum = index + 2
      const row = sheet.addRow({
        no: index + 1,
        nama: att.namaLengkap,
        nipNrp: att.nipNrp,
        jabatan: att.jabatan,
        unitKerja: att.unitKerja,
        sebagai: att.sebagai,
        signature: '',
        waktu: att.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      })

      row.height = 60

      // Embed signature image
      if (att.signature && att.signature.startsWith('data:image/png;base64,') && att.signature.length <= MAX_EXPORT_SIGNATURE_LENGTH) {
        try {
          const base64Data = att.signature.replace('data:image/png;base64,', '')
          const imageId = workbook.addImage({
            base64: base64Data,
            extension: 'png',
          })
          sheet.addImage(imageId, {
            tl: { col: 6, row: rowNum - 1 },
            ext: { width: 130, height: 50 },
          })
        } catch {
          // Skip invalid signature images gracefully
        }
      }
    })

    // Borders
    sheet.eachRow((row: ExcelJS.Row) => {
      row.eachCell((cell: ExcelJS.Cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }
        cell.alignment = { vertical: 'middle', wrapText: true }
      })
    })

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="daftar-hadir-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Error exporting:', error)
    return NextResponse.json(
      { error: 'Gagal mengekspor data' },
      { status: 500 }
    )
  }
}
