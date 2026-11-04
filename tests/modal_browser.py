"""Teste do motor de janelas do painel sem rede/sem Supabase.
Uso: python tests/modal_browser.py (precisa Playwright e Chromium local).
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
src=Path('src/main.js').read_text()
start=src.index('function modal(')
end=src.index('function lineChart(')
fragment=src[start:end]
script="""const esc=(s)=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');\n"""+fragment+"\nwindow.openModal=openModal; window.closeModal=closeModal;"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=b.new_page()
    page.set_content('<!doctype html><html lang="pt-BR"><head><style>.modal-back{position:fixed;inset:0;display:grid;place-items:center;background:#888}.modal{background:#fff;width:400px;padding:20px}</style></head><body><button id="launcher">Abrir formulário</button></body></html>')
    page.evaluate('(source)=>eval(source)',script)
    titles=['Novo ponto de avaliação','Novo funcionário','Editar funcionário','Editar Caixa 01','Iniciar turno','Avaliação 12345678','Ocorrência 12345678','Convidar usuário','Ajuda','Detalhes do Caixa','QR Code • Caixa 01','Novo cliente SaaS']
    for i,title in enumerate(titles,1):
        page.locator('#launcher').focus()
        page.evaluate('(t)=>window.openModal(t, `<form id="teste"><input name="teste" placeholder="Preencha"><button type="button">Teste</button></form>`, `<button type="button" data-close-modal>Cancelar</button><button data-save-point>Salvar</button>`, true)',title)
        dlg=page.get_by_role('dialog')
        assert dlg.count()==1, (i,title,'sem modal')
        assert dlg.locator('h2').inner_text()==title,(i,title,'titulo errado')
        assert dlg.locator('#teste input').count()==1
        assert dlg.locator('.modal-foot [data-save-point]').count()==1
        assert page.locator('body').get_attribute('class')=='modal-open'
        page.keyboard.press('Escape')
        assert page.get_by_role('dialog').count()==0
        assert page.locator('body').get_attribute('class')==''
        print('OK',str(i).zfill(2),title)
    # botão de fechar e clique no fundo
    page.evaluate('window.openModal("Teste fechar", "<p>Ok</p>", "<button data-close-modal>Fechar</button>")')
    page.locator('.modal-foot [data-close-modal]').click()
    assert page.get_by_role('dialog').count()==0
    page.evaluate('window.openModal("Teste backdrop", "<p>Ok</p>")')
    page.locator('.modal-back').click(position={'x':2,'y':2})
    assert page.get_by_role('dialog').count()==0
    print('OK Fechamento por botão e clique externo')
    b.close()
