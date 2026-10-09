"""Build editable examples with the installation's locked Office libraries."""
import argparse
import json
import re
from datetime import datetime
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
from pathlib import Path
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import ColorScaleRule


def meeting_table(document, rows, widths):
    table = document.add_table(rows=0, cols=len(rows[0]))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    for column, width in zip(table.columns, widths):
        column.width = Cm(width)
    borders = OxmlElement('w:tblBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        node = OxmlElement('w:' + edge)
        for key, value in [('val', 'single'), ('sz', '4'), ('color', 'D9D9D9')]:
            node.set(qn('w:' + key), value)
        borders.append(node)
    table._tbl.tblPr.append(borders)
    for index, values in enumerate(rows):
        row = table.add_row()
        row._tr.get_or_add_trPr().append(OxmlElement('w:cantSplit'))
        if index == 0:
            row._tr.get_or_add_trPr().append(OxmlElement('w:tblHeader'))
        for column, (cell, text, width) in enumerate(zip(row.cells, values, widths)):
            cell.width, cell.vertical_alignment = Cm(width), WD_CELL_VERTICAL_ALIGNMENT.CENTER
            margins = OxmlElement('w:tcMar')
            for edge, value in [('top', '100'), ('bottom', '100'), ('left', '120'), ('right', '120')]:
                node = OxmlElement('w:' + edge); node.set(qn('w:w'), value); node.set(qn('w:type'), 'dxa'); margins.append(node)
            cell._tc.get_or_add_tcPr().append(margins)
            if index == 0:
                fill = OxmlElement('w:shd'); fill.set(qn('w:fill'), 'EAF0F5'); cell._tc.get_or_add_tcPr().append(fill)
            paragraph = cell.paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(0)
            paragraph.paragraph_format.line_spacing = 1.3
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER if column in (1, 2) else WD_ALIGN_PARAGRAPH.LEFT
            run = paragraph.add_run(text); run.bold = index == 0; run.font.size = Pt(10)
    return table


def meeting_word(item, output):
    document = Document()
    document.core_properties.created = document.core_properties.modified = datetime(2026, 9, 1)
    document.core_properties.author = 'DSH Desktop'
    section = document.sections[0]
    section.page_width, section.page_height = Cm(21), Cm(29.7)
    section.top_margin, section.bottom_margin = Cm(1.9), Cm(1.8)
    section.left_margin, section.right_margin = Cm(2.1), Cm(2.1)
    for name, size, bold in [('Normal', 11, False), ('Title', 23, True), ('Subtitle', 10, False), ('Heading 1', 14, True), ('Heading 2', 11, True)]:
        style = document.styles[name]
        style.font.name, style.font.size, style.font.bold = '微软雅黑', Pt(size), bold
        style.font.color.rgb = RGBColor(0, 0, 0)
        style.element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'), '微软雅黑')
        style.paragraph_format.line_spacing = 1.35
        style.paragraph_format.space_after = Pt(7 if name == 'Normal' else 10)
        if name.startswith('Heading'):
            style.paragraph_format.space_before = Pt(14)
            style.paragraph_format.keep_with_next = True
    for index, page in enumerate(item['pagesContent']):
        if index:
            document.add_page_break()
        document.add_paragraph('会议纪要' if index == 0 else '会议纪要 / 执行跟进', 'Subtitle')
        document.add_paragraph(page['title'], 'Title')
        if page.get('subtitle'):
            document.add_paragraph(page['subtitle'], 'Subtitle')
        for block in page['sections']:
            document.add_paragraph(block['title'], 'Heading 1')
            for text in block.get('text', '').split('\n'):
                if text:
                    document.add_paragraph(text)
            for topic in block.get('topics', []):
                document.add_paragraph(topic['title'], 'Heading 2')
                document.add_paragraph(topic['text'])
            if block.get('table'):
                meeting_table(document, block['table'], block['widths'])
    document.save(output)


def word(item, output):
    if item['id'] == 'meeting-minutes':
        return meeting_word(item, output)
    document = Document()
    document.core_properties.created = document.core_properties.modified = datetime(2026, 9, 1)
    document.core_properties.author = 'DSH Desktop'
    section = document.sections[0]
    section.page_width, section.page_height = Cm(21), Cm(29.7)
    section.top_margin, section.bottom_margin = Cm(2.3), Cm(2.3)
    section.left_margin, section.right_margin = Cm(2.5), Cm(2.5)
    normal = document.styles['Normal']
    normal.font.name, normal.font.size = '宋体', Pt(12)
    normal.element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'), '宋体')
    normal.paragraph_format.space_after = Pt(8)
    normal.paragraph_format.line_spacing = 1.35
    for name, size in [('Title', 22), ('Heading 1', 16)]:
        style = document.styles[name]
        style.font.name, style.font.size = '黑体', Pt(size)
        style.element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'), '黑体')
        style.font.color.rgb = __import__('docx').shared.RGBColor(0, 0, 0)
    for index, page in enumerate(item['pagesContent']):
        if index:
            document.add_page_break()
        document.add_paragraph(page['title'], 'Title')
        if page.get('subtitle'):
            document.add_paragraph(page['subtitle'])
        for block in page['sections']:
            document.add_paragraph(block['title'], 'Heading 1')
            for text in block.get('text', '').split('\n'):
                if text:
                    document.add_paragraph(text)
            if block.get('table'):
                table = document.add_table(rows=0, cols=len(block['table'][0]))
                table.style = 'Table Grid'
                for row in block['table']:
                    cells = table.add_row().cells
                    for cell, text in zip(cells, row):
                        cell.text = text
                for cell in table.rows[0].cells:
                    for run in cell.paragraphs[0].runs:
                        run.bold = True
    footer = section.footer.paragraphs[0]
    footer.alignment = 1
    field = OxmlElement('w:fldSimple')
    field.set(qn('w:instr'), 'PAGE')
    footer._p.append(field)
    document.save(output)


def style_book(book):
    for sheet in book:
        sheet.freeze_panes = 'A2'
        sheet.sheet_view.showGridLines = False
        for cell in sheet[1]:
            cell.font = Font(name='微软雅黑', bold=True, color='FFFFFF', size=12)
            cell.fill = PatternFill('solid', fgColor='25465B')
        sheet.row_dimensions[1].height = 28
        for row in sheet.iter_rows(min_row=2):
            for cell in row:
                cell.font = Font(name='微软雅黑', size=11)
                cell.alignment = Alignment(vertical='center', wrap_text=True)
                sheet.row_dimensions[cell.row].height = 23
        for letter in 'ABCDEFGHI':
            sheet.column_dimensions[letter].width = 17
        sheet.sheet_properties.pageSetUpPr.fitToPage = True
        sheet.page_setup.orientation = 'landscape'
        sheet.page_setup.paperSize = sheet.PAPERSIZE_A4
        sheet.page_setup.fitToWidth, sheet.page_setup.fitToHeight = 1, 1


def excel(item, output):
    book = Workbook()
    book.properties.created = book.properties.modified = datetime(2026, 9, 1)
    book.properties.creator = 'DSH Desktop'
    sheet = book.active
    if item['id'] == 'budget-expenses':
        sheet.title = '费用总览'
        sheet.append(['费用类别', '预算金额', '实际金额', '预算结余', '执行率'])
        for n, category in enumerate(['人员', '软件', '差旅', '培训', '其他'], 2):
            sheet.append([category, 10000 + n * 3000, f'SUMIF(费用明细!B2:B11,A{n},费用明细!E2:E11)', f'=B{n}-C{n}', f'=IFERROR(C{n}/B{n},0)'])
            sheet.cell(n, 3).value = '=' + sheet.cell(n, 3).value
            sheet.cell(n, 5).number_format = '0.0%'
        sheet.append(['合计', '=SUM(B2:B6)', '=SUM(C2:C6)', '=B7-C7', '=IFERROR(C7/B7,0)'])
        detail = book.create_sheet('费用明细')
        detail.append(['日期', '类别', '事项', '负责人', '金额', '备注'])
        for n in range(10):
            detail.append([f'2026-09-{n+1:02d}', ['人员', '软件', '差旅', '培训', '其他'][n % 5], '示例费用', '项目办公室', 2000 + n * 700, '模拟数据'])
        chart = BarChart()
        chart.title = '预算与实际费用'
        chart.add_data(Reference(sheet, min_col=2, max_col=3, min_row=1, max_row=6), titles_from_data=True)
        chart.set_categories(Reference(sheet, min_col=1, min_row=2, max_row=6))
        sheet.add_chart(chart, 'A10')
    elif item['id'] == 'project-tracker':
        sheet.title = '项目总览'
        sheet.append(['状态', '任务数', '占比'])
        for n, status in enumerate(['未开始', '进行中', '已完成'], 2):
            sheet.append([status, f'=COUNTIF(任务台账!F2:F11,A{n})', f'=IFERROR(B{n}/SUM(B2:B4),0)'])
            sheet.cell(n, 3).number_format = '0%'
        sheet.append(['总任务', '=COUNTA(任务台账!A2:A11)', ''])
        sheet.append(['平均完成率', '=AVERAGE(任务台账!G2:G11)', ''])
        sheet['B6'].number_format = '0%'
        detail = book.create_sheet('任务台账')
        detail.append(['任务编号', '任务名称', '负责人', '开始日期', '计划完成', '状态', '完成率', '备注'])
        for n in range(10):
            detail.append([f'T{n+1:02d}', ['资料整理', '方案评审', '开发联调', '业务验收'][n % 4], ['产品', '研发', '交付'][n % 3], '2026-09-01', '2026-09-15', ['未开始', '进行中', '已完成'][n % 3], [0, .5, 1][n % 3], '示例任务'])
            detail.cell(n + 2, 7).number_format = '0%'
        validation = DataValidation(type='list', formula1='"未开始,进行中,已完成"')
        detail.add_data_validation(validation)
        validation.add('F2:F1000')
        detail.conditional_formatting.add('G2:G1000', ColorScaleRule(start_type='num', start_value=0, start_color='FFF3D6', end_type='num', end_value=1, end_color='D9EEDC'))
        chart = BarChart()
        chart.title = '任务状态分布'
        chart.add_data(Reference(sheet, min_col=2, min_row=1, max_row=4), titles_from_data=True)
        chart.set_categories(Reference(sheet, min_col=1, min_row=2, max_row=4))
        sheet.add_chart(chart, 'A9')
    else:
        sheet.title = '销售总览'
        sheet.append(['月份', '销售额', '成本', '毛利', '毛利率'])
        for n in range(2, 8):
            sheet.append([f'{n-1}月', f'=SUMIF(销售明细!A2:A13,A{n},销售明细!D2:D13)', f'=SUMIF(销售明细!A2:A13,A{n},销售明细!E2:E13)', f'=B{n}-C{n}', f'=IFERROR(D{n}/B{n},0)'])
            sheet.cell(n, 5).number_format = '0.0%'
        sheet.append(['合计', '=SUM(B2:B7)', '=SUM(C2:C7)', '=B8-C8', '=IFERROR(D8/B8,0)'])
        detail = book.create_sheet('销售明细')
        detail.append(['月份', '产品', '数量', '销售额', '成本', '备注'])
        for n in range(12):
            detail.append([f'{n//2+1}月', ['产品A', '产品B'][n % 2], 10 + n, 8000 + n * 600, 5000 + n * 300, '模拟数据'])
        chart = LineChart()
        chart.title = '销售额与毛利'
        chart.add_data(Reference(sheet, min_col=2, max_col=2, min_row=1, max_row=7), titles_from_data=True)
        chart.add_data(Reference(sheet, min_col=4, max_col=4, min_row=1, max_row=7), titles_from_data=True)
        chart.set_categories(Reference(sheet, min_col=1, min_row=2, max_row=7))
        sheet.add_chart(chart, 'A11')
    style_book(book)
    book.save(output)


def normalize_package(path):
    # Kit allocates random chart-axis IDs. Canonical local IDs preserve the
    # axis-reference graph while giving equivalent workbooks stable revisions.
    with ZipFile(path) as archive:
        entries = [(name, archive.read(name)) for name in sorted(archive.namelist())]
    normalized = []
    for name, data in entries:
        if name == 'docProps/core.xml':
            data = re.sub(rb'(<dcterms:(?:created|modified)[^>]*>)[^<]+', rb'\g<1>2026-09-01T00:00:00Z', data)
        if re.fullmatch(r'xl/charts/chart\d+\.xml', name):
            axis_ids = {}
            def stable_axis(match):
                original = match.group(2)
                axis_ids.setdefault(original, str(100000 + len(axis_ids)).encode())
                return match.group(1) + axis_ids[original] + match.group(3)
            data = re.sub(rb'(<(?:[\w.-]+:)?(?:axId|crossAx)\b[^>]*\bval=")(\d+)(")', stable_axis, data)
        normalized.append((name, data))
    with ZipFile(path, 'w', compression=ZIP_DEFLATED) as archive:
        for name, data in normalized:
            info = ZipInfo(name, (2026, 9, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            archive.writestr(info, data)


def main():
    import sys
    if len(sys.argv) == 3 and sys.argv[1] == '--normalize-package':
        normalize_package(Path(sys.argv[2]))
        return
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('output')
    args = parser.parse_args()
    root = Path(args.output)
    for item in json.loads(Path(args.source).read_text()):
        directory = root / item['id']
        directory.mkdir(parents=True, exist_ok=True)
        sample = directory / ('example.docx' if item['mode'] == 'word' else 'example.xlsx')
        (word if item['mode'] == 'word' else excel)(item, sample)
        normalize_package(sample)
        guidance = ('检查章节、决议及行动项。保持可编辑文字和表格。' if item['mode'] == 'word' else
                    '保留原生公式、工作表和图表。修改数据后重算，并独立核对关键数值。')
        if item['id'] == 'meeting-minutes':
            guidance += ('\n\n沿用 A4 纵向、约 2cm 页边距、23pt 黑色主标题、14pt 一级标题与 11pt 正文。'
                         '行动项集中为一张表，采用浅色表头、细灰边框、自动行高、重复表头及约 10pt 表格文字。'
                         '任务与交付标准左对齐，负责人和期限居中。保留案例的标题与表格样式，按内容自然分页。'
                         '\n\n已定事项、讨论建议与待确认事项分别呈现。责任人、期限及条件以用户原文为依据，缺失信息使用待确认。'
                         '完成后用官方 Kit 导出 PDF 并逐页检查，交付可编辑 DOCX。')
        (directory / 'design.md').write_text(
            f"# {item['title']}\n\n{item['description']}\n\n保留当前案例的版式和结构，以用户当前材料替换全部示例事实。未知字段保留为待确认。\n\n" + guidance + '\n')



if __name__ == '__main__':
    main()
