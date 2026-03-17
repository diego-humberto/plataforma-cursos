import re
import io


def format_timestamp_pdf(seconds):
    """Formata segundos em HH:MM:SS ou MM:SS para PDF."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def pdf_css():
    return """
        @page { size: A4; margin: 2cm 2.5cm; }
        body {
            font-family: Helvetica, Arial, sans-serif;
            font-size: 11pt;
            color: #222;
            line-height: 1.5;
        }
        h1 {
            font-size: 14pt;
            color: #111;
            margin-bottom: 16px;
            border-bottom: 2px solid #333;
            padding-bottom: 8px;
        }
        h2 {
            font-size: 14pt;
            color: #222;
            margin-top: 24px;
            margin-bottom: 6px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 4px;
        }
        h3 {
            font-size: 12pt;
            color: #333;
            margin-top: 16px;
            margin-bottom: 8px;
        }
        .course-name {
            font-size: 10pt;
            color: #555;
            margin-top: 0;
            margin-bottom: 4px;
        }
        .module-path {
            font-size: 10pt;
            color: #555;
            margin-top: 0;
            margin-bottom: 20px;
        }
        .note {
            margin-bottom: 6px;
            margin-top: 14px;
            padding: 0 0 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .timestamp {
            font-family: Courier;
            font-size: 9pt;
            color: #555;
            margin-bottom: 2px;
        }
        p, div, span, ol, ul, li, strong, em, u, s, code, pre, blockquote {
            border: 0;
        }
        p { margin: 3px 0; }
        ol {
            list-style-type: decimal;
            margin: 4px 0;
            padding-left: 30px;
        }
        ul {
            list-style-type: disc;
            margin: 4px 0;
            padding-left: 30px;
        }
        li {
            margin: 2px 0;
            padding-left: 4px;
        }
        strong { font-weight: bold; }
        em { font-style: italic; }
        u { text-decoration: underline; }
        s { text-decoration: line-through; }
        code {
            font-family: Courier;
            font-size: 10pt;
            background-color: #f0f0f0;
            padding: 1px 3px;
        }
        pre {
            font-family: Courier;
            font-size: 10pt;
            background-color: #f5f5f5;
            padding: 8px;
            margin: 6px 0;
        }
        blockquote {
            border-left: 3px solid #ccc;
            padding-left: 12px;
            margin: 6px 0;
            color: #555;
        }
    """


def preprocess_html_for_pdf(html):
    """Converte <ol>/<ul> para itens numerados/com bullet manualmente (xhtml2pdf nao renderiza list-style)."""

    def strip_p_tags(text):
        """Remove <p> e </p> do conteudo interno de <li>."""
        return re.sub(r'</?p[^>]*>', '', text).strip()

    def replace_ol(match):
        content = match.group(1)
        items = re.findall(r'<li>(.*?)</li>', content, re.DOTALL)
        result = ''
        for i, item in enumerate(items, 1):
            result += f'<p style="margin-left:20px;">{i}. {strip_p_tags(item)}</p>\n'
        return result

    def replace_ul(match):
        content = match.group(1)
        items = re.findall(r'<li>(.*?)</li>', content, re.DOTALL)
        result = ''
        for item in items:
            result += f'<p style="margin-left:20px;">&bull; {strip_p_tags(item)}</p>\n'
        return result

    html = re.sub(r'<ol[^>]*>(.*?)</ol>', replace_ol, html, flags=re.DOTALL)
    html = re.sub(r'<ul[^>]*>(.*?)</ul>', replace_ul, html, flags=re.DOTALL)
    return html


def generate_pdf(html_string):
    """Converte HTML em PDF usando xhtml2pdf."""
    from xhtml2pdf import pisa
    html_string = preprocess_html_for_pdf(html_string)
    result = io.BytesIO()
    pisa_status = pisa.CreatePDF(html_string, dest=result)
    if pisa_status.err:
        return None
    result.seek(0)
    return result
