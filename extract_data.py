import json, datetime
from pathlib import Path
import openpyxl

def read(name):
    wb = openpyxl.load_workbook(Path(r'C:\Users\Rayom\Downloads') / name, data_only=True)
    result = []
    for sheet in wb:
        rows = list(sheet.values)
        headers = list(rows[0])
        for row in rows[1:]:
            if not row[0]: continue
            result.append({k: v.isoformat()[:10] if isinstance(v, datetime.datetime) else v for k, v in zip(headers, row)})
    return headers, result

mh, master = read('Master Shipment Sheet.xlsx')
ih, invoices = read('Merge Invoice Excel Sheet.xlsx')
master = [r for r in master if str(r['Status'] or '').lower() in ['', 'pending', 'dispatched', 'in transit', 'in-transit'] and not r['Delivered Date']]
keys = {(r['Company'], str(r['Invoice Number'])) for r in master}
invoices = [r for r in invoices if (r['Company'], str(r['Invoice Number'])) in keys]
Path('src/data').mkdir(parents=True, exist_ok=True)
Path('src/data/shipments.json').write_text(json.dumps({'masterHeaders': mh, 'mergeHeaders': ih, 'master': master, 'merge': invoices}, ensure_ascii=False), encoding='utf-8')
print('In-transit shipments:', len(master), '| Invoice lines:', len(invoices))
