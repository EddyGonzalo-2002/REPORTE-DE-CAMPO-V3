import pandas as pd
import json
import zipfile
import xml.etree.ElementTree as ET
import re
import os

sheets = ['SECTOR 1', 'SECTOR 2', 'SECTOR 3', 'SECTOR 4', 'SECTOR 5', 'SECTOR 6']
target_cuadrillas = ['CUADRILLA-03-L', 'CUADRILLA-04-L', 'CUADRILLA-01-C', 'CUADRILLA-02-C']
url = 'https://docs.google.com/spreadsheets/d/1enauD12DiGlj5GM_P-_JF3HdpoZ-m92xzBRdjFEfuak/export?format=xlsx'

kmz_path = 'POR CUADRILLAS, FECHAS- AD - INST - SECTORES - MP-CUSCO.kmz'
kml_coords = {}
if os.path.exists(kmz_path):
    print('Parsing KMZ to extract coordinates...')
    try:
        with zipfile.ZipFile(kmz_path, 'r') as kmz:
            kml = kmz.read('doc.kml')
            root = ET.fromstring(kml)
            ns = {'kml': 'http://www.opengis.net/kml/2.2'}
            for pm in root.findall('.//kml:Placemark', ns):
                name = pm.find('kml:name', ns)
                coords = pm.find('.//kml:coordinates', ns)
                if name is not None and coords is not None:
                    nums = re.findall(r'\d{2}', name.text)
                    if nums:
                        c_text = coords.text.strip().split(',')
                        if len(c_text) >= 2:
                            kml_coords[nums[0]] = {
                                'Longitud': c_text[0].strip(),
                                'Latitud': c_text[1].strip()
                            }
        print(f'Extracted {len(kml_coords)} coordinates from KMZ.')
    except Exception as e:
        print('Error reading KMZ:', e)

output_data = {c: {} for c in target_cuadrillas}

def get_punto_name(loc):
    raw = loc.get('CAMARA PTZ', '')
    if not raw or raw == '0': raw = loc.get('CAMARA MULTISENSOR', '')
    if not raw or raw == '0': raw = loc.get('ALTAVOZ IP', '')
    return str(raw).strip()

# Fetch Master Data
print('Fetching SECTORES PARA TRABAJO...')
try:
    df_master = pd.read_excel(url, sheet_name='SECTORES PARA TRABAJO', dtype=str).fillna('')
    master_dict = {}
    for i in range(len(df_master)):
        r_dict = df_master.iloc[i].to_dict()
        pk = get_punto_name(r_dict)
        if pk:
            master_dict[pk] = r_dict
    print(f'Master dictionary populated with {len(master_dict)} items.')
except Exception as e:
    print('Failed to fetch master data:', e)
    master_dict = {}

for sheet in sheets:
    try:
        print(f'Fetching {sheet}...')
        df = pd.read_excel(url, sheet_name=sheet, header=None, dtype=str).fillna('')
    except Exception as e:
        print(f'Could not fetch {sheet}: {e}')
        continue
    
    t1_headers = [str(x).strip() for x in df.iloc[0, :15].tolist()]
    t2_headers = [str(x).strip() for x in df.iloc[0, 16:].tolist()]
    
    t1_data = []
    for i in range(1, len(df)):
        if not str(df.iloc[i, 0]).strip():
            break
        row_dict = {}
        for j, h in enumerate(t1_headers):
            row_dict[h] = str(df.iloc[i, j]).strip()
        t1_data.append(row_dict)
        
    point_logistics = {}
    t2_cuad_cols = {}
    
    for j, h in enumerate(t2_headers):
        val = h.upper()
        if val in target_cuadrillas:
            t2_cuad_cols[val] = 16 + j
            
    point_cols = {}
    for j, h in enumerate(t2_headers):
        if j == 0 or h == 'TOTALES' or h == '' or h.upper() in target_cuadrillas:
            continue
        point_cols[h] = 16 + j

    t2_data_global = []

    for i in range(1, len(df)):
        item = str(df.iloc[i, 16]).strip()
        if not item:
            continue
            
        row_global = {'Item': item}
        for cuad, col_idx in t2_cuad_cols.items():
            row_global[cuad] = str(df.iloc[i, col_idx]).strip()
        t2_data_global.append(row_global)
        
        for pt_name, col_idx in point_cols.items():
            qty = str(df.iloc[i, col_idx]).strip()
            if qty and qty != '0' and qty != '0.0':
                if pt_name not in point_logistics:
                    point_logistics[pt_name] = []
                point_logistics[pt_name].append({
                    'Item': item,
                    'Cantidad': qty
                })
                
    for cuad in target_cuadrillas:
        cuad_t1 = []
        for row in t1_data:
            pk = get_punto_name(row)
            if pk in master_dict:
                master_row = master_dict[pk]
                
                # Update critical fields from master
                fields_to_update = [
                    'ESTADO OPERATIVO',
                    'FECHAS DE INSTALACION GABINETES (ADECUACION O INSTALACION NUEVA)',
                    'FECHAS DE INSTALACION CAMARAS PTZ Y MULTISENSOR , MEGAFONOS IP , BOTON DE PANICO',
                    'CUADRILLA - TIPO',
                    'CUADRILLA - TIPO.1'
                ]
                for f in fields_to_update:
                    if f in master_row:
                        row[f] = str(master_row[f]).split(' ')[0] # Split in case of datetime format with times
                        if row[f] == '00:00:00':
                            row[f] = str(master_row[f])

            # Count actual IP devices to apply logic for Switch Wi-Tek (Panic button is an H4 Video Intercom, an IP device)
            device_count = 0
            ptz_count = 0
            multi_count = 0
            altavoz_count = 0
            for d_col in ['CAMARA PTZ', 'CAMARA MULTISENSOR', 'ALTAVOZ IP', 'BOTON DE PANICO']:
                v = str(row.get(d_col, '')).strip().upper()
                if v and v != '0' and v != '0.0' and not v.startswith('NO'):
                    device_count += 1
                    if d_col == 'CAMARA PTZ': ptz_count += 1
                    elif d_col == 'CAMARA MULTISENSOR': multi_count += 1
                    elif d_col == 'ALTAVOZ IP': altavoz_count += 1

            expected_pararrayos = ptz_count + multi_count + altavoz_count
            expected_patchcord = (ptz_count * 2) + (multi_count * 2) + (altavoz_count * 1)

            medio_com = str(row.get('MEDIO DE COMUNICACION', '')).strip().upper()
            needs_extra_patchcord = False
            if 'MEDIA CONVERTE' in medio_com or 'FIBRA' in medio_com:
                needs_extra_patchcord = True
            elif 'NO EXISTE' in medio_com or medio_com == 'NAN' or medio_com == '':
                needs_extra_patchcord = True
            elif device_count > 1: # Represents presence of switch
                needs_extra_patchcord = True
                
            if needs_extra_patchcord:
                expected_patchcord += 1

            is_assigned = False
            for k, v in row.items():
                if isinstance(v, str) and v.upper() == cuad:
                    is_assigned = True
                    break
            
            if is_assigned:
                mats = point_logistics.get(pk, [])
                
                # Apply dynamic logistics correction: Remove Switch if <= 1 device, modify Prensaestopa, add Pilotos, Pararrayos, Patchcords
                new_mats = []
                pararrayos_item_name = 'PARARRAYOS ETHERNET (UND)'
                patchcord_item_name = 'PATCHORE CAT 6A (UN)'
                
                for m in mats:
                    i_name = str(m.get('Item', '')).upper()
                    if device_count <= 1 and ('SWITCH WI-TEK' in i_name or 'FUENTE DE PODER DEL SWITCH' in i_name):
                        continue
                    if 'PRENSAESTOPA' in i_name:
                        new_mats.append({'Item': m['Item'], 'Cantidad': '3'})
                    elif 'PARARRAYOS' in i_name:
                        pararrayos_item_name = m['Item']
                        continue
                    elif 'PATCHORE' in i_name or 'PATCH CORD' in i_name or 'PATCHCORD' in i_name:
                        patchcord_item_name = m['Item']
                        continue
                    else:
                        new_mats.append(m)
                        
                if not any('PRENSAESTOPA' in str(m.get('Item', '')).upper() for m in new_mats):
                    new_mats.append({'Item': 'PRENSAESTOPA (UND)', 'Cantidad': '3'})
                
                if expected_pararrayos > 0:
                    new_mats.append({'Item': pararrayos_item_name, 'Cantidad': str(expected_pararrayos)})
                if expected_patchcord > 0:
                    new_mats.append({'Item': patchcord_item_name, 'Cantidad': str(expected_patchcord)})
                
                new_mats.append({'Item': 'PILOTO LED VERDE Y ROJO (PAR)', 'Cantidad': '1'})
                
                if pk and pk != '0':
                    nums = re.findall(r'\d{2}', str(pk))
                    if nums and nums[0] in kml_coords:
                        row['Latitud'] = kml_coords[nums[0]]['Latitud']
                        row['Longitud'] = kml_coords[nums[0]]['Longitud']

                row['MaterialesPunto'] = new_mats
                cuad_t1.append(row)
                
        cuad_t2 = []
        for row in t2_data_global:
            qty = row.get(cuad, '')
            if qty and qty != '0' and qty != '0.0':
                cuad_t2.append({
                    'Item': row['Item'],
                    'Cantidad': qty
                })
                
        output_data[cuad][sheet] = {
            'Instalaciones': cuad_t1,
            'Materiales': cuad_t2
        }

with open('webapp/src/data.json', 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)
print('Data extracted successfully with point materials and updated master dates.')
