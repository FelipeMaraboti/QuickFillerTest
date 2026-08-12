import { describe, it, expect } from 'vitest'
import { extrairCartaoPonto } from './cartaoPonto'
import { extrairHolerite } from './holerite'

describe('Extractors', () => {
  it('deve extrair dados do cartão de ponto simples', () => {
    const textoMock = `
      Mes/Ano : 7 / 2012 Tipo de Jornada: FLEXIVEL
      1 - DOM 08:00
      2 - SEG 08:00 09:03 14:05 HE-BCO DE HORAS 00:13
      15:12 18:36 HE-REMUNERADA 00:13
    `
    const resultado = extrairCartaoPonto([textoMock])

    expect(resultado.pages.length).toBe(1)
    expect(resultado.pages[0].days.length).toBe(2)
    
    // Verificando dia 1 (DOM)
    expect(resultado.pages[0].days[0].date_raw).toContain('1 - DOM')
    expect(resultado.pages[0].days[0].punches.length).toBe(0)

    // Verificando dia 2 (SEG)
    const dia2 = resultado.pages[0].days[1]
    expect(dia2.date_raw).toContain('2 - SEG')
    expect(dia2.punches.length).toBe(4) // 09:03, 14:05, 15:12, 18:36

    expect(dia2.punches[0]).toEqual({ kind: 'IN', time_raw: '09:03', time_hhmm: '09:03' })
    expect(dia2.punches[1]).toEqual({ kind: 'OUT', time_raw: '14:05', time_hhmm: '14:05' })
    expect(dia2.punches[2]).toEqual({ kind: 'IN', time_raw: '15:12', time_hhmm: '15:12' })
  })

  it('deve extrair dados do cartão de ponto formato em linha', () => {
    const textoMock = `
      16/12/2019 SEG 07:00d 12:00d 13:00d 17:00d
    `
    const resultado = extrairCartaoPonto([textoMock])
    
    expect(resultado.pages[0].days.length).toBe(1)
    const dia1 = resultado.pages[0].days[0]
    expect(dia1.date_raw).toBe('16/12/2019')
    expect(dia1.punches.length).toBe(4)
    expect(dia1.punches[0].time_hhmm).toBe('07:00')
    expect(dia1.punches[0].time_raw).toBe('07:00d')
  })

  it('deve extrair holerite separando fields de bases', () => {
    const textoMock = `
      Período : 10/2019 Data Pagto: 31.10.2019
      0105 Dias Trabalhados 30,00 1.678,61
      2007 Horas Extras 100% 5,00 76,30
      Total 1.967,07 859,46
      Líqüido 1.107,61
      Base I.N.S.S. : 1.967,07 F.G.T.S. do Mês : 157,37
    `
    const resultado = extrairHolerite([textoMock])

    expect(resultado.pages.length).toBe(1)
    const pagina = resultado.pages[0]
    
    expect(pagina.month).toBe('10')
    expect(pagina.year).toBe('2019')

    // As duas primeiras são fields (Dias Trabalhados, Horas Extras)
    expect(pagina.fields.length).toBe(2)
    expect(pagina.fields[0].code).toBe('0105')
    expect(pagina.fields[0].label).toContain('Dias Trabalhados')
    expect(pagina.fields[0].value).toBe('1.678,61')

    // As bases/totais incluem Total e Líquido, então serão 4 itens
    expect(pagina.bases.length).toBe(4)
    expect(pagina.bases[0].label).toContain('Total')
    expect(pagina.bases[1].label).toContain('Líqüido')
    expect(pagina.bases[2].label).toContain('Base INSS')
    expect(pagina.bases[2].value).toBe('1.967,07')
    expect(pagina.bases[3].label).toContain('FGTS do Mês')
    expect(pagina.bases[3].value).toBe('157,37')
  })
})
