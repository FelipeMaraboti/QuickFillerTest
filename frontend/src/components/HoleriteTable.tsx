import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { AlertCircle } from 'lucide-react'

interface HoleriteField {
  code: string
  description: string
  reference: string
  proventos: string
  descontos: string
}

interface HoleriteBase {
  label: string
  value: string
}

interface HoleriteTableProps {
  data: { pages: { period_month_year: string, fields: HoleriteField[], bases: HoleriteBase[] }[] }
  onChange: (newData: any) => void
}

export default function HoleriteTable({ data, onChange }: HoleriteTableProps) {
  const handleChange = (pageIndex: number, section: 'fields' | 'bases', index: number, key: string, newValue: string) => {
    const newData = JSON.parse(JSON.stringify(data))
    if (section === 'fields') {
      newData.pages[pageIndex].fields[index][key] = newValue
    } else {
      newData.pages[pageIndex].bases[index][key] = newValue
    }
    onChange(newData)
  }

  return (
    <div className="flex flex-col space-y-12 h-[60vh] overflow-auto pb-8 pr-2">
      {data.pages.map((page: any, pageIndex: number) => (
        <div key={pageIndex} className="space-y-6">
          {/* Vencimentos e Descontos */}
          <div className="border border-slate-800 rounded-lg overflow-hidden flex-shrink-0">
            <div className="bg-slate-900 p-3 border-b border-slate-800 font-semibold flex flex-col md:flex-row justify-between items-start md:items-center text-slate-300 gap-2">
              <span>Vencimentos e Descontos</span>
              <div className="flex gap-2 flex-wrap">
                {page?.paymentType && <span className="text-sm bg-blue-900/30 text-blue-400 border border-blue-800/50 px-2 py-1 rounded">Tipo: {page.paymentType}</span>}
                {page?.paymentDate && <span className="text-sm bg-green-900/30 text-green-400 border border-green-800/50 px-2 py-1 rounded">Pagto: {page.paymentDate}</span>}
                <span className="text-sm bg-slate-800 px-2 py-1 rounded">Período: {page?.period_month_year || `${page?.month}/${page?.year}` || 'Não encontrado'}</span>
              </div>
            </div>
            <Table>
              <TableHeader className="bg-slate-900/50">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="w-[80px] text-slate-400">Cód</TableHead>
                  <TableHead className="text-slate-400">Descrição</TableHead>
                  <TableHead className="text-right text-slate-400">Ref.</TableHead>
                  <TableHead className="text-right text-green-400/80">Proventos</TableHead>
                  <TableHead className="text-right text-red-400/80">Descontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page?.fields.map((f: any, i: number) => (
                  <TableRow key={i} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="p-2"><Input value={f.code || ''} onChange={e => handleChange(pageIndex, 'fields', i, 'code', e.target.value)} className="h-8 bg-slate-900 border-slate-700 text-sm" /></TableCell>
                    <TableCell className="p-2"><Input value={f.description || ''} onChange={e => handleChange(pageIndex, 'fields', i, 'description', e.target.value)} className="h-8 bg-slate-900 border-slate-700 text-sm" /></TableCell>
                    <TableCell className="p-2"><Input value={f.reference || ''} onChange={e => handleChange(pageIndex, 'fields', i, 'reference', e.target.value)} className="h-8 bg-slate-900 border-slate-700 text-sm text-right" /></TableCell>
                    <TableCell className="p-2">
                      <div className="relative">
                        <Input value={f.proventos || ''} onChange={e => handleChange(pageIndex, 'fields', i, 'proventos', e.target.value)} className={`h-8 bg-slate-900 border-slate-700 text-right text-green-400 ${(f.proventos || '').includes('?') ? 'border-yellow-500/50 bg-yellow-950/20 text-yellow-200' : ''}`} />
                        {(f.proventos || '').includes('?') && <AlertCircle className="w-4 h-4 absolute left-2 top-2 text-yellow-500" />}
                      </div>
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="relative">
                        <Input value={f.descontos || ''} onChange={e => handleChange(pageIndex, 'fields', i, 'descontos', e.target.value)} className={`h-8 bg-slate-900 border-slate-700 text-right text-red-400 ${(f.descontos || '').includes('?') ? 'border-yellow-500/50 bg-yellow-950/20 text-yellow-200' : ''}`} />
                        {(f.descontos || '').includes('?') && <AlertCircle className="w-4 h-4 absolute left-2 top-2 text-yellow-500" />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!page?.fields || page.fields.length === 0) && (
                   <TableRow className="border-slate-800 hover:bg-transparent">
                     <TableCell colSpan={5} className="h-24 text-center text-slate-500">Nenhum campo encontrado</TableCell>
                   </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Bases */}
          <div className="border border-slate-800 rounded-lg overflow-hidden flex-shrink-0">
            <div className="bg-slate-900 p-3 border-b border-slate-800 font-semibold text-slate-300">
              Totais e Bases
            </div>
            <div className="p-3 grid grid-cols-2 xl:grid-cols-3 gap-2 bg-slate-950/30 max-h-[30vh] overflow-y-auto">
              {page?.bases.map((b: any, i: number) => (
                <div key={i} className="flex flex-col bg-slate-900 border border-slate-800 rounded p-2 hover:border-slate-700 transition-colors">
                  <input 
                    value={b.label}
                    onChange={e => handleChange(pageIndex, 'bases', i, 'label', e.target.value)}
                    className="text-[11px] text-slate-400 font-medium mb-1.5 bg-transparent border-none outline-none w-full truncate focus:text-slate-300"
                    title={b.label}
                  />
                  <div className="relative mt-auto">
                    <Input 
                      value={b.value || ''} 
                      onChange={e => handleChange(pageIndex, 'bases', i, 'value', e.target.value)} 
                      className={`h-7 text-xs bg-slate-950 border-slate-800 text-right ${(b.value || '').includes('?') ? 'text-yellow-200 border-yellow-500/50 bg-yellow-950/20' : ''}`} 
                    />
                    {(b.value || '').includes('?') && <AlertCircle className="w-3 h-3 absolute left-2 top-2 text-yellow-500" />}
                  </div>
                </div>
              ))}
              {(!page?.bases || page.bases.length === 0) && (
                 <div className="col-span-full text-center py-4 text-slate-500 text-sm">Nenhuma base encontrada</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
