import { extrairHolerite } from './src/extractors/holerite.js'
import { describe, it, expect } from 'vitest'

describe('Debug test', () => {
  it('debug', () => {
    const textoMock = `
      Período : 10/2019 Data Pagto: 31.10.2019
      0105 Dias Trabalhados 30,00 1.678,61
      2007 Horas Extras 100% 5,00 76,30
      Total 1.967,07 859,46
      Líqüido 1.107,61
      Base I.N.S.S. : 1.967,07 F.G.T.S. do Mês : 157,37
    `
    const res = extrairHolerite([textoMock])
    console.log(res.pages[0].fields)
  })
})
