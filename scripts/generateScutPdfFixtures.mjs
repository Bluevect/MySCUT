#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const fixtureDir = resolve(rootDir, 'tests/fixtures/public')
const pageWidth = 842
const pageHeight = 595
const tableLeft = 28
const nodeColumnWidth = 58
const dayColumnWidth = 104
const tableTop = 132
const tableHeaderHeight = 25
const nodeHeight = 34

const weekdays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
const weekdayAliases = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

function escapePdfLiteral(value) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function encodeUtf16BeHex(value) {
  const bytes = []
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index)
    bytes.push((codeUnit >> 8) & 0xff, codeUnit & 0xff)
  }
  return Buffer.from(bytes).toString('hex').toUpperCase()
}

function textCommand({ font = 'F1', size = 8, x, top, text, unicode = false }) {
  const y = pageHeight - top - size
  const encoded = unicode ? `<${encodeUtf16BeHex(text)}>` : `(${escapePdfLiteral(text)})`
  return `BT /${font} ${size} Tf ${x} ${y} Td ${encoded} Tj ET`
}

function lineCommand(x1, top1, x2, top2) {
  return `${x1} ${pageHeight - top1} m ${x2} ${pageHeight - top2} l S`
}

function rectangleCommand(x, top, width, height) {
  return `${x} ${pageHeight - top - height} ${width} ${height} re S`
}

function buildPdf(contentCommands, title) {
  const content = `${contentCommands.join('\n')}\n`
  const mappedCharacters = Array.from(new Set(
    '华南理工大学学生个人课表学年期号校区编号节次星期一二三四五六日课程周教师地点分'.split(''),
  ))
  const characterMappings = mappedCharacters
    .map((character) => {
      const encoded = encodeUtf16BeHex(character)
      return `<${encoded}> <${encoded}>`
    })
    .join('\n')
  const toUnicodeCMap = `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /TEST-Identity-UCS def
/CMapType 2 def
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
${mappedCharacters.length} beginbfchar
${characterMappings}
endbfchar
endcmap
CMapName currentdict /CMap defineresource pop
end
end`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [7 0 R] /ToUnicode 8 0 R >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}endstream`,
    '<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 4 >> /DW 1000 >>',
    `<< /Length ${Buffer.byteLength(toUnicodeCMap, 'latin1')} >>\nstream\n${toUnicodeCMap}\nendstream`,
    `<< /Title (${escapePdfLiteral(title)}) /Author (TEST-FIXTURE-GENERATOR) /Creator (scripts/generateScutPdfFixtures.mjs) >>`,
  ]

  let pdf = '%PDF-1.4\n%TEST-SYNTHETIC-SCUT-PDF\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += `${'0'.repeat(10)} 65535 f \n`
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 9 0 R >>\n`
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`

  return Buffer.from(pdf, 'latin1')
}

function drawLabelAndValue(commands, label, value, x, top, options = {}) {
  const size = options.size ?? 6
  const labelWidth = options.labelWidth ?? 22
  commands.push(textCommand({ font: 'F2', size, x, top, text: label, unicode: true }))
  commands.push(textCommand({ size, x: x + labelWidth, top, text: value }))
}

function dayColumnLeft(day) {
  return tableLeft + nodeColumnWidth + (day - 1) * dayColumnWidth
}

function nodeTop(node) {
  return tableTop + tableHeaderHeight + (node - 1) * nodeHeight
}

function drawLesson(commands, lesson) {
  const cellLeft = dayColumnLeft(lesson.day)
  const cellTop = nodeTop(lesson.startNode)
  const cellHeight = nodeHeight * (lesson.endNode - lesson.startNode + 1)
  const cellBottom = pageHeight - cellTop - cellHeight
  commands.push(`q 1 g ${cellLeft + 0.5} ${cellBottom + 0.5} ${dayColumnWidth - 1} ${cellHeight - 1} re f 0 G ${cellLeft} ${cellBottom} ${dayColumnWidth} ${cellHeight} re S Q`)

  const left = cellLeft + 3
  const top = cellTop + 4
  const lineHeight = 8

  commands.push(textCommand({ size: 5.5, x: left, top, text: `COURSE:${lesson.course}` }))
  commands.push(textCommand({ size: 5.5, x: left, top: top + lineHeight, text: `WEEKS:${lesson.weeks}` }))
  commands.push(textCommand({ size: 5.5, x: left, top: top + lineHeight * 2, text: `NODES:${lesson.startNode}-${lesson.endNode}` }))
  commands.push(textCommand({ size: 5.5, x: left, top: top + lineHeight * 3, text: `TEACHER:${lesson.teacher}` }))
  commands.push(textCommand({ size: 5.5, x: left, top: top + lineHeight * 4, text: `ROOM:${lesson.room}` }))
  commands.push(textCommand({ size: 5.5, x: left, top: top + lineHeight * 5, text: `CREDIT:${lesson.credit}` }))
}

function createSupportedFixture() {
  const commands = ['q', '0 G', '0.65 w']
  commands.push(textCommand({ font: 'F2', size: 17, x: 305, top: 24, text: '华南理工大学学生个人课表', unicode: true }))
  commands.push(textCommand({ size: 7, x: 356, top: 47, text: 'SCUT STUDENT TIMETABLE V1' }))
  commands.push(textCommand({ size: 8, x: 32, top: 60, text: 'ACADEMIC-YEAR:2026-2027' }))
  commands.push(textCommand({ size: 8, x: 190, top: 60, text: 'SEMESTER:1' }))
  commands.push(textCommand({ size: 8, x: 285, top: 60, text: 'STUDENT-ID:TEST-STUDENT-001' }))
  commands.push(textCommand({ size: 8, x: 505, top: 60, text: 'CAMPUS:TEST-CAMPUS' }))
  commands.push(textCommand({ size: 8, x: 650, top: 60, text: 'SCHEDULE-ID:TEST-SCHEDULE-001' }))

  const tableWidth = nodeColumnWidth + dayColumnWidth * weekdays.length
  const tableHeight = tableHeaderHeight + nodeHeight * 12
  commands.push(rectangleCommand(tableLeft, tableTop, tableWidth, tableHeight))
  commands.push(lineCommand(tableLeft, tableTop + tableHeaderHeight, tableLeft + tableWidth, tableTop + tableHeaderHeight))
  commands.push(textCommand({ font: 'F2', size: 8, x: tableLeft + 17, top: tableTop + 8, text: '节次', unicode: true }))
  commands.push(textCommand({ size: 5, x: tableLeft + 20, top: tableTop + 17, text: 'NODE' }))

  for (let column = 0; column <= weekdays.length; column += 1) {
    const x = tableLeft + nodeColumnWidth + column * dayColumnWidth
    commands.push(lineCommand(x, tableTop, x, tableTop + tableHeight))
  }

  weekdays.forEach((weekday, index) => {
    commands.push(textCommand({
      font: 'F2',
      size: 8,
      x: dayColumnLeft(index + 1) + 37,
      top: tableTop + 8,
      text: weekday,
      unicode: true,
    }))
    commands.push(textCommand({
      size: 5,
      x: dayColumnLeft(index + 1) + 44,
      top: tableTop + 17,
      text: weekdayAliases[index],
    }))
  })

  for (let node = 1; node <= 12; node += 1) {
    const top = nodeTop(node)
    commands.push(lineCommand(tableLeft, top + nodeHeight, tableLeft + tableWidth, top + nodeHeight))
    commands.push(textCommand({ size: 7, x: tableLeft + 24, top: top + 11, text: String(node) }))
  }

  const lessons = [
    {
      day: 1,
      startNode: 1,
      endNode: 2,
      course: 'TEST-COURSE-ALPHA',
      weeks: '1-15(ODD)',
      teacher: 'TEST-TEACHER-A,B',
      room: 'TEST-ROOM-A101',
      credit: 3.5,
    },
    {
      day: 2,
      startNode: 3,
      endNode: 5,
      course: 'TEST-COURSE-BETA',
      weeks: '2-16(EVEN)',
      teacher: 'TEST-TEACHER-C',
      room: 'TEST-ROOM-B202',
      credit: 2,
    },
    {
      day: 3,
      startNode: 6,
      endNode: 7,
      course: 'TEST-COURSE-GAMMA',
      weeks: '1-4,9-12',
      teacher: 'TEST-TEACHER-D',
      room: 'TEST-ROOM-C303',
      credit: 1.5,
    },
    {
      day: 5,
      startNode: 9,
      endNode: 10,
      course: 'TEST-COURSE-ALPHA',
      weeks: '2-14/2',
      teacher: 'TEST-TEACHER-A',
      room: 'TEST-ROOM-D404',
      credit: 3.5,
    },
  ]
  lessons.forEach((lesson) => drawLesson(commands, lesson))
  commands.push('Q')

  return buildPdf(commands, 'TEST-SCUT-FIXED-LAYOUT-SUPPORTED')
}

function createUnsupportedFixture() {
  const commands = ['q', '0 G', '0.65 w']
  commands.push(textCommand({ size: 18, x: 255, top: 45, text: 'UNSUPPORTED GENERIC TABLE EXPORT' }))
  commands.push(rectangleCommand(90, 120, 660, 260))
  commands.push(textCommand({ size: 12, x: 125, top: 165, text: 'TEST-COURSE-UNSUPPORTED' }))
  commands.push(textCommand({ size: 12, x: 125, top: 205, text: 'TEST-TEACHER-UNSUPPORTED' }))
  commands.push(textCommand({ size: 12, x: 125, top: 245, text: 'TEST-ROOM-UNSUPPORTED' }))
  commands.push('Q')
  return buildPdf(commands, 'TEST-SCUT-FIXED-LAYOUT-UNSUPPORTED')
}

mkdirSync(fixtureDir, { recursive: true })
writeFileSync(resolve(fixtureDir, 'scutSchedule.synthetic.pdf'), createSupportedFixture())
writeFileSync(resolve(fixtureDir, 'scutSchedule.unsupported.synthetic.pdf'), createUnsupportedFixture())

console.log('Generated synthetic SCUT PDF fixtures.')
