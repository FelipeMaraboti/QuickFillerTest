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
  const page = data.pages[0] // Assumindo página única para o holerite para simplificar

  const handleChange = (section: 'fields' | 'bases', index: number, key: string, newValue: string) => {
    const newData = JSON.parse(JSON.stringify(data))
    if (section === 'fields') {
      newData.pages[0].fields[index][key] = newValue
    } else {
      newData.pages[0].bases[index][key] = newValue
    }
    onChange(newData)
  }

  return (
    <div className="flex flex-col space-y-6 h-[60vh] overflow-auto pb-8">
      
      {/* Vencimentos e Descontos */}
      <div className="border border-slate-800 rounded-lg overflow-hidden">
        <div className="bg-slate-900 p-3 border-b border-slate-800 font-semibold flex justify-between items-center text-slate-300">
          <span>Vencimentos e Descontos</span>
          <span className="text-sm bg-slate-800 px-2 py-1 rounded">Período: {page?.period_month_year || 'Não encontrado'}</span>
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
            {page?.fields.map((f, i) => (
              <TableRow key={i} className="border-slate-800 hover:bg-slate-800/50">
                <TableCell className="p-2"><Input value={f.code} onChange={e => handleChange('fields', i, 'code', e.target.value)} className="h-8 bg-slate-900 border-slate-700 text-sm" /></TableCell>
                <TableCell className="p-2"><Input value={f.description} onChange={e => handleChange('fields', i, 'description', e.target.value)} className="h-8 bg-slate-900 border-slate-700 text-sm" /></TableCell>
                <TableCell className="p-2"><Input value={f.reference} onChange={e => handleChange('fields', i, 'reference', e.target.value)} className="h-8 bg-slate-900 border-slate-700 text-sm text-right" /></TableCell>
                <TableCell className="p-2">
                  <div className="relative">
                    <Input value={f.proventos} onChange={e => handleChange('fields', i, 'proventos', e.target.value)} className={`h-8 bg-slate-900 border-slate-700 text-sm text-right ${f.proventos.includes('?') ? 'text-yellow-200 border-yellow-500/50 bg-yellow-950/20' : ''}`} />
                    {f.proventos.includes('?') && <AlertCircle className="w-4 h-4 absolute left-2 top-2 text-yellow-500" />}
                  </div>
                </TableCell>
                <TableCell className="p-2">
                  <div className="relative">
                    <Input value={f.descontos} onChange={e => handleChange('fields', i, 'descontos', e.target.value)} className={`h-8 bg-slate-900 border-slate-700 text-sm text-right ${f.descontos.includes('?') ? 'text-yellow-200 border-yellow-500/50 bg-yellow-950/20' : ''}`} />
                    {f.descontos.includes('?') && <AlertCircle className="w-4 h-4 absolute left-2 top-2 text-yellow-500" />}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!page?.fields || page.fields.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhum campo encontrado</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bases */}
      <div className="border border-slate-800 rounded-lg overflow-hidden">
        <div className="bg-slate-900 p-3 border-b border-slate-800 font-semibold text-slate-300">
          Totais e Bases
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          {page?.bases.map((b, i) => (
            <div key={i} className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">{b.label}</label>
              <div className="relative">
                <Input 
                  value={b.value} 
                  onChange={e => handleChange('bases', i, 'value', e.target.value)} 
                  className={`h-9 bg-slate-900 border-slate-700 ${b.value.includes('?') ? 'text-yellow-200 border-yellow-500/50 bg-yellow-950/20' : ''}`} 
                />
                {b.value.includes('?') && <AlertCircle className="w-4 h-4 absolute right-2 top-2.5 text-yellow-500" />}
              </div>
            </div>
          ))}
          {(!page?.bases || page.bases.length === 0) && (
             <div className="col-span-full text-center py-4 text-slate-500">Nenhuma base encontrada</div>
          )}
        </div>
      </div>

    </div>
  )
}
