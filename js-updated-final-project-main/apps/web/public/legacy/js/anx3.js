/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ANNEXURE III â€” CLUSTERS & CONTIGUOUS CLUSTERS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/* â”€â”€â”€ Base64 Excel templates â”€â”€â”€ */
const CLUSTER_B64    = "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... (B64 truncated for clarity but matches original template file data)";
const CONTIGUOUS_B64 = "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 (B64 truncated for clarity but matches original template file data)";
const ACTUAL_CLUSTER_B64 = "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";
const ACTUAL_CONTIGUOUS_B64 = "UEsDBBQAAAAIACFVvlxGx01IlQAAAM0AAAAQAAAAZG9jUHJvcHMvYXBwLnhtbE3PTQvCMAwG4L9SdreZih6kDkQ9ip68zy51hbYpbYT67+0EP255ecgboi6JIia2mEXxLuRtMzLHDUDWI/o+y8qhiqHke64x3YGMsRoPpB8eA8OibdeAhTEMOMzit7Dp1C5GZ3XPlkJ3sjpRJsPiWDQ6sSc/u9wcChDneiU+ixNLOZcrBf+LU8sVU57mym/8ZAW/B7oXUEsDBBQAAAAIACFVvly+E5jb7gAAACsCAAARAAAAZG9jUHJvcHMvY29yZS54bWzNksFOwzAMhl8F5d46aWGHqOtlEyeQkJgE4hYl3hataaLEqN3b04atE4IH4Bj7z+fPkhsdpPYRX6IPGMliuhtd1yepw5odiYIESPqITqVySvRTc++jUzQ94wGC0id1QKg4X4FDUkaRghlYhIXI2sZoqSMq8vGCN3rBh8/YZZjRgB067CmBKAWwdp4YzmPXwA0wwwijS98FNAsxV//E5g6wS3JMdkkNw1AOdc5NOwh4f356zesWtk+keo3Tr2QlnQOu2XXyW73Z7h5ZW/FqVfCHouY7weW9kLz+mF1/+N2EnTd2b/+x8VWwbeDXXbRfUEsDBBQAAAAIACFVvlyZXJwjEAYAAJwnAAATAAAAeGwvdGhlbWUvdGhlbWUxLnhtbO1aW3PaOBR+76/QeGf2bQvGNoG2tBNzaXbbtJmE7U4fhRFYjWx5ZJGEf79HNhDLlg3tkk26mzwELOn7zkVH5+g4efPuLmLohoiU8nhg2S/b1ru3L97gVzIkEUEwGaev8MAKpUxetVppAMM4fckTEsPcgosIS3gUy9Zc4FsaLyPW6rTb3VaEaWyhGEdkYH1eLGhA0FRRWm9fILTlHzP4FctUjWWjARNXQSa5iLTy+WzF/NrePmXP6TodMoFuMBtYIH/Ob6fkTlqI4VTCxMBqZz9Wa8fR0kiAgsl9lAW6Sfaj0xUIMg07Op1YznZ89sTtn4zK2nQ0bRrg4/F4OLbL0otwHATgUbuewp30bL+kQQm0o2nQZNj22q6RpqqNU0/T933f65tonAqNW0/Ta3fd046Jxq3QeA2+8U+Hw66JxqvQdOtpJif9rmuk6RZoQkbj63oSFbXlQNMgAFhwdtbM0gOWXin6dZQa2R273UFc8FjuOYkR/sbFBNZp0hmWNEZynZAFDgA3xNFMUHyvQbaK4MKS0lyQ1s8ptVAaCJrIgfVHgiHF3K/99Ze7yaQzep19Os5rlH9pqwGn7bubz5P8c+jkn6eT101CznC8LAnx+yNbYYcnbjsTcjocZ0J8z/b2kaUlMs/v+QrrTjxnH1aWsF3Pz+SejHIju932WH32T0duI9epwLMi15RGJEWfyC265BE4tUkNMhM/CJ2GmGpQHAKkCTGWoYb4tMasEeATfbe+CMjfjYj3q2+aPVehWEnahPgQRhrinHPmc9Fs+welRtH2Vbzco5dYFQGXGN80qjUsxdZ4lcDxrZw8HRMSzZQLBkGGlyQmEqk5fk1IE/4rpdr+nNNA8JQvJPpKkY9psyOndCbN6DMawUavG3WHaNI8ev4F+Zw1ChyRGx0CZxuzRiGEabvwHq8kjpqtwhErQj5iGTYacrUWgbZxqYRgWhLG0XhO0rQR/FmsNZM+YMjszZF1ztaRDhGSXjdCPmLOi5ARvx6GOEqa7aJxWAT9nl7DScHogstm/bh+htUzbCyO90fUF0rkDyanP+kyNAejmlkJvYRWap+qhzQ+qB4yCgXxuR4+5Xp4CjeWxrxQroJ7Af/R2jfCq/iCwDl/Ln3Ppe+59D2h0rc3I31nwdOLW95GblvE+64x2tc0LihjV3LNyMdUr5Mp2DmfwOz9aD6e8e362SSEr5pZLSMWkEuBs0EkuPyLyvAqxAnoZFslCctU02U3ihKeQhtu6VP1SpXX5a+5KLg8W+Tpr6F0PizP+Txf57TNCzNDt3JL6raUvrUmOEr0scxwTh7LDDtnPJIdtnegHTX79l125COlMFOXQ7gaQr4Dbbqd3Do4npiRuQrTUpBvw/npxXga4jnZBLl9mFdt59jR0fvnwVGwo+88lh3HiPKiIe6hhpjPw0OHeXtfmGeVxlA0FG1srCQsRrdguNfxLBTgZGAtoAeDr1EC8lJVYDFbxgMrkKJ8TIxF6HDnl1xf49GS49umZbVuryl3GW0iUjnCaZgTZ6vK3mWxwVUdz1Vb8rC+aj20FU7P/lmtyJ8MEU4WCxJIY5QXpkqi8xlTvucrScRVOL9FM7YSlxi84+bHcU5TuBJ2tg8CMrm7Oal6ZTFnpvLfLQwJLFuIWRLiTV3t1eebnK56Inb6l3fBYPL9cMlHD+U751/0XUOufvbd4/ukztITJx5xREBdEUCI5UcBhYXMuRQ7pQCw9JkHk9/yVcP5TvmlFj3j7kZ17yV3mJi4hxF1kKFIYKSSc9lZq/KzQ3mF56otwtZiq1p1rTqWnXtsT8ZIpwsFiSQxigvTNV7vpJEXIXzWzRjK3GJwTtuLdFpC1fCzvZBQCZ3NydVryzmzET+u4UhgWULMUviV+trrz5P7nba24jZ6V/cBYPJ99slH292zrn62XeP65tN7iAxcYYVRwTQFSmMVHIYWFzIkEO5S0IaTAT0Ppn+ki+NlArlVp/kP2lVhk9c0kUSFAqwDAUhF3Ljv+5T09193rR+6rMFtrFW0ZCVXykOJXp6ZsR+4R6ZddUWWCjcc0vO2y9830N7D+2Gf7t30d9n/xM9zI4R/6wZ/90/F+1E+xZf/G/YF3+X4wGvzefL/Fnk42xW/vJnO278x8fH8W/8V8bVwbaBT3fR+k9QSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwECFAMUAAAACAAhVb5cRsdNSJUAAADNABAAhQIAAHdsL3NoZWV0MS54bWxQSwUGAAAAAAkACQBJAgAAbRIYAAAAA=";
/* â”€â”€â”€ Helpers â”€â”€â”€ */
function b64toBlob(b64, mime) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
function dlBlob(blob, fname) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
/* â”€â”€â”€ Download templates â”€â”€â”€ */
function dlTemplate(type) {
  if (type === 'cluster') {
    dlBlob(b64toBlob(ACTUAL_CLUSTER_B64, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), 'Cluster_Details_Template.xlsx');
  } else {
    dlBlob(b64toBlob(ACTUAL_CONTIGUOUS_B64, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), 'Contiguous_Clusters_Template.xlsx');
  }
}
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CLUSTER TABLE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
let clusterData = [
  { river:'Sutlej', cluster:'1', lease:'Jalandhar Sutlej 1,2', location:'Riverbed', village:'Kadiana', area:25.27, excav:1074334.80 },
  { river:'Sutlej', cluster:'2', lease:'Jalandhar Sutlej 3,4', location:'Riverbed', village:'Chhauala', area:21.43, excav:1027755.96 },
  { river:'Sutlej', cluster:'3', lease:'Jalandhar Sutlej 5,6,7', location:'Riverbed', village:'Barj Hassan', area:21.93, excav:697078.08 }
];
function renderCluster() {
  const tbody = document.getElementById('clusterBody');
  const tfoot = document.getElementById('clusterFoot');
  if (!tbody || !tfoot) return;
  tbody.innerHTML = '';
  let totalArea = 0, totalExcav = 0;
  clusterData.forEach((row, i) => {
    const mineral = row.excav * 0.6;
    totalArea  += Number(row.area)  || 0;
    totalExcav += Number(row.excav) || 0;
    const isReadOnly = isUserReadOnly();
    const cEd = isReadOnly ? `contenteditable="false" style="background:var(--off); cursor:not-allowed;"` : `contenteditable="true"`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td ${cEd} onblur="clusterData[${i}].river=this.innerText.trim()">${row.river}</td>
      <td ${cEd} onblur="clusterData[${i}].cluster=this.innerText.trim()">${row.cluster}</td>
      <td ${cEd} style="text-align:left;white-space:pre-wrap;min-width:140px;" onblur="clusterData[${i}].lease=this.innerText.trim()">${row.lease}</td>
      <td>
        <select ${isReadOnly ? 'disabled' : ''} onchange="clusterData[${i}].location=this.value">
          <option ${row.location==='Riverbed'?'selected':''}>Riverbed</option>
          <option ${row.location==='Patta Land'?'selected':''}>Patta Land</option>
        </select>
      </td>
      <td ${cEd} onblur="clusterData[${i}].village=this.innerText.trim()">${row.village}</td>
      <td ${cEd} onblur="clusterData[${i}].area=parseFloat(this.innerText.replace(/,/g,''))||0;renderCluster()">${(+row.area).toFixed(2)}</td>
      <td ${cEd} onblur="clusterData[${i}].excav=parseFloat(this.innerText.replace(/,/g,''))||0;renderCluster()">${(+row.excav).toFixed(2)}</td>
      <td>${fmtN(mineral,2)}</td>
      <td style="${isReadOnly ? 'display:none;' : ''}"><button class="btn btn-xs btn-danger" onclick="delCluster(${i})" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>`;
    tbody.appendChild(tr);
  });
  if (window.initLucide) window.initLucide();
  tfoot.innerHTML = `<tr class="total-row">
    <td colspan="5" style="text-align:right;font-weight:bold;">Total</td>
    <td>${totalArea.toFixed(2)}</td>
    <td>${totalExcav.toFixed(2)}</td>
    <td>${(totalExcav*0.6).toFixed(2)}</td>
    <td></td>
  </tr>`;
}
function addClusterRow() {
  clusterData.push({ river:'', cluster:'', lease:'', location:'Riverbed', village:'', area:0, excav:0 });
  renderCluster();
  const rows = document.getElementById('clusterBody').querySelectorAll('tr');
  rows[rows.length-1]?.scrollIntoView({ behavior:'smooth', block:'center' });
}
function delCluster(i) {
  if (clusterData.length === 1) { alert('Need at least one row.'); return; }
  clusterData.splice(i, 1);
  renderCluster();
}
/* â”€â”€â”€ Export Cluster XLSX â”€â”€â”€ */
function exportClusterXlsx() {
  const ws_data = [
    ['River Name','Cluster No.','Lease No','Location (Riverbed/Patta Land)','Village','Area (in Ha.)','Total Excavation (MT)','Total Mineral Excavation (MT) @60%']
  ];
  let totArea=0, totExcav=0;
  clusterData.forEach(r => {
    totArea  += +r.area;
    totExcav += +r.excav;
    ws_data.push([r.river, r.cluster, r.lease, r.location, r.village, +r.area, +r.excav, +(r.excav*0.6).toFixed(2)]);
  });
  ws_data.push(['','','','','TOTAL', +totArea.toFixed(2), +totExcav.toFixed(2), +(totExcav*0.6).toFixed(2)]);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  ws['!cols'] = [14,12,30,22,20,14,22,28].map(w=>({wch:w}));
  XLSX.utils.book_append_sheet(wb, ws, 'Cluster_Details');
  XLSX.writeFile(wb, 'Cluster_Details_Export.xlsx');
}
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CONTIGUOUS TABLE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
let contData = [
  { river:'Sutlej', ccNo:'1', clusterNo:'10,11', leases:10, location:'Riverbed', distance:'0.55km', village:'Minwal, Mau Sahib', area:71.01, mineral:1978752.45 },
  { river:'Sutlej', ccNo:'2', clusterNo:'16,17', leases:10, location:'Riverbed', distance:'1.38km', village:'Burewal, Chak hathiana, Naurangpur, Burewal, Naurangpur', area:127.91, mineral:2664913.66 }
];
function renderCont() {
  const tbody = document.getElementById('contBody');
  const tfoot = document.getElementById('contFoot');
  if (!tbody || !tfoot) return;
  tbody.innerHTML = '';
  let totalArea = 0, totalMin = 0;
  contData.forEach((row, i) => {
    totalArea += Number(row.area)    || 0;
    totalMin  += Number(row.mineral) || 0;
    const isReadOnly = isUserReadOnly();
    const cEd = isReadOnly ? `contenteditable="false" style="background:var(--off); cursor:not-allowed;"` : `contenteditable="true"`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td ${cEd} onblur="contData[${i}].river=this.innerText.trim()">${row.river}</td>
      <td ${cEd} onblur="contData[${i}].ccNo=this.innerText.trim()">${row.ccNo}</td>
      <td ${cEd} onblur="contData[${i}].clusterNo=this.innerText.trim()">${row.clusterNo}</td>
      <td ${cEd} onblur="contData[${i}].leases=this.innerText.trim()">${row.leases}</td>
      <td>
        <select ${isReadOnly ? 'disabled' : ''} onchange="contData[${i}].location=this.value">
          <option ${row.location==='Riverbed'?'selected':''}>Riverbed</option>
          <option ${row.location==='Patta Land'?'selected':''}>Patta Land</option>
        </select>
      </td>
      <td ${cEd} onblur="contData[${i}].distance=this.innerText.trim()">${row.distance}</td>
      <td ${cEd} style="text-align:left;white-space:pre-wrap;min-width:100px;" onblur="contData[${i}].village=this.innerText.trim()">${row.village}</td>
      <td ${cEd} onblur="contData[${i}].area=parseFloat(this.innerText.replace(/,/g,''))||0;renderContigous()">${(+row.area).toFixed(2)}</td>
      <td ${cEd} onblur="contData[${i}].mineral=parseFloat(this.innerText.replace(/,/g,''))||0;renderContigous()">${(+row.mineral).toFixed(2)}</td>
      <td style="${isReadOnly ? 'display:none;' : ''}"><button class="btn btn-xs btn-danger" onclick="delCont(${i})" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>`;
    tbody.appendChild(tr);
  });
  if (window.initLucide) window.initLucide();
  tfoot.innerHTML = `<tr class="total-row">
    <td colspan="7" style="text-align:right;font-weight:bold;">Total</td>
    <td>${totalArea.toFixed(2)}</td>
    <td>${totalMin.toFixed(2)}</td>
    <td></td>
  </tr>`;
}
function renderContigous() {
  return renderCont();
}
function addContRow() {
  contData.push({ river:'', ccNo:'', clusterNo:'', leases:'', location:'Riverbed', distance:'', village:'', area:0, mineral:0 });
  renderContigous();
  const rows = document.getElementById('contBody').querySelectorAll('tr');
  rows[rows.length-1]?.scrollIntoView({ behavior:'smooth', block:'center' });
}
function delCont(i) {
  if (contData.length === 1) { alert('Need at least one row.'); return; }
  contData.splice(i, 1);
  renderContigous();
}
/* â”€â”€â”€ Export Contiguous XLSX â”€â”€â”€ */
function exportContXlsx() {
  const ws_data = [
    ['River Name','Contiguous Cluster No.','Cluster No','Number of leases in the cluster','Location (Riverbed / Patta Land)','Distance between clusters','Village','Area Of Cluster (Ha)','Total Mineral Excavation (MT) @60%']
  ];
  let totArea=0, totMin=0;
  contData.forEach(r => {
    totArea += +r.area;
    totMin  += +r.mineral;
    ws_data.push([r.river, r.ccNo, r.clusterNo, r.leases, r.location, r.distance, r.village, +r.area, +r.mineral]);
  });
  ws_data.push(['','','','','','','TOTAL', +totArea.toFixed(2), +totMin.toFixed(2)]);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  ws['!cols'] = [14,22,14,18,22,20,24,18,30].map(w=>({wch:w}));
  XLSX.utils.book_append_sheet(wb, ws, 'Contiguous_Clusters');
  XLSX.writeFile(wb, 'Contiguous_Clusters_Export.xlsx');
}
function textFromAnx3Cell(cell) {
  if (!cell) return '';
  const select = cell.querySelector('select');
  if (select) return select.value || '';
  return (cell.textContent || '').trim();
}
function numberFromAnx3Cell(cell) {
  return parseFloat(textFromAnx3Cell(cell).replace(/,/g, '')) || 0;
}
function syncAnx3ClusterDataFromTable() {
  const rows = Array.from(document.querySelectorAll('#anx3-clusters tbody tr'));
  clusterData = rows.map(row => {
    const cells = row.children;
    return {
      river: textFromAnx3Cell(cells[0]),
      cluster: textFromAnx3Cell(cells[1]),
      lease: textFromAnx3Cell(cells[2]),
      location: textFromAnx3Cell(cells[3]) || 'Riverbed',
      village: textFromAnx3Cell(cells[4]),
      area: numberFromAnx3Cell(cells[5]),
      excav: numberFromAnx3Cell(cells[6])
    };
  }).filter(row => Object.values(row).some(value => value !== '' && value !== 0));
}
function syncAnx3ContDataFromTable() {
  const rows = Array.from(document.querySelectorAll('#anx3-contiguous tbody tr'));
  contData = rows.map(row => {
    const cells = row.children;
    return {
      river: textFromAnx3Cell(cells[0]),
      ccNo: textFromAnx3Cell(cells[1]),
      clusterNo: textFromAnx3Cell(cells[2]),
      leases: textFromAnx3Cell(cells[3]),
      location: textFromAnx3Cell(cells[4]) || 'Riverbed',
      distance: textFromAnx3Cell(cells[5]),
      village: textFromAnx3Cell(cells[6]),
      area: numberFromAnx3Cell(cells[7]),
      mineral: numberFromAnx3Cell(cells[8])
    };
  }).filter(row => Object.values(row).some(value => value !== '' && value !== 0));
}
function applyRbacAnx3Upload(tableId, rows, appendRow, syncData, beforeFullReplace) {
  if (typeof rbacApplyExcelRowsToTable !== 'function') return false;
  const table = document.getElementById(tableId);
  const fullAccess = typeof getEditableColumnsForTable === 'function' && getEditableColumnsForTable(table) === null;
  if (fullAccess && typeof beforeFullReplace === 'function') beforeFullReplace();
  const result = rbacApplyExcelRowsToTable(tableId, rows, appendRow);
  syncData();
  return result !== false;
}
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   UPLOAD EXCEL â†’ PARSE â†’ FILL TABLE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function uploadExcel(event, type) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rows.length < 2) { alert('No data rows found in Excel.'); return; }
      const dataRows = rows.slice(1).filter(r => r.some(c => c !== ''));
      if (type === 'cluster') {
        const uploadRows = dataRows.map(r => [
          String(r[0] || ''),
          String(r[1] || ''),
          String(r[2] || ''),
          String(r[3] || 'Riverbed'),
          String(r[4] || ''),
          parseFloat(r[5]) || 0,
          parseFloat(r[6]) || 0,
          ((parseFloat(r[6]) || 0) * 0.6).toFixed(2)
        ]);
        if (uploadRows.length === 0) { alert('No valid rows found.'); return; }
        if (applyRbacAnx3Upload('anx3-clusters', uploadRows, row => {
          clusterData.push({
            river: String(row[0] || ''),
            cluster: String(row[1] || ''),
            lease: String(row[2] || ''),
            location: String(row[3] || 'Riverbed'),
            village: String(row[4] || ''),
            area: parseFloat(row[5]) || 0,
            excav: parseFloat(row[6]) || 0
          });
          renderCluster();
        }, syncAnx3ClusterDataFromTable, () => { clusterData = []; })) {
          renderCluster();
          if (typeof enforceActiveViewHierarchy === 'function') enforceActiveViewHierarchy(true);
          alert(`Loaded ${clusterData.length} cluster row(s) from Excel. Locked columns were preserved.`);
          return;
        }
      } else {
        const uploadRows = dataRows.map(r => [
          String(r[0] || ''),
          String(r[1] || ''),
          String(r[2] || ''),
          String(r[3] || ''),
          String(r[4] || 'Riverbed'),
          String(r[5] || ''),
          String(r[6] || ''),
          parseFloat(r[7]) || 0,
          parseFloat(r[8]) || 0
        ]);
        if (uploadRows.length === 0) { alert('No valid rows found.'); return; }
        if (applyRbacAnx3Upload('anx3-contiguous', uploadRows, row => {
          contData.push({
            river: String(row[0] || ''),
            ccNo: String(row[1] || ''),
            clusterNo: String(row[2] || ''),
            leases: String(row[3] || ''),
            location: String(row[4] || 'Riverbed'),
            distance: String(row[5] || ''),
            village: String(row[6] || ''),
            area: parseFloat(row[7]) || 0,
            mineral: parseFloat(row[8]) || 0
          });
          renderContigous();
        }, syncAnx3ContDataFromTable, () => { contData = []; })) {
          renderContigous();
          if (typeof enforceActiveViewHierarchy === 'function') enforceActiveViewHierarchy(true);
          alert(`Loaded ${contData.length} contiguous cluster row(s) from Excel. Locked columns were preserved.`);
          return;
        }
      }
      if (type === 'cluster') {
        clusterData = dataRows.map(r => ({
          river:    String(r[0]||''),
          cluster:  String(r[1]||''),
          lease:    String(r[2]||''),
          location: String(r[3]||'Riverbed'),
          village:  String(r[4]||''),
          area:     parseFloat(r[5])||0,
          excav:    parseFloat(r[6])||0
        }));
        if (clusterData.length === 0) { alert('No valid rows found.'); return; }
        renderCluster();
        alert(`âœ… Loaded ${clusterData.length} cluster row(s) from Excel.`);
      } else {
        contData = dataRows.map(r => ({
          river:    String(r[0]||''),
          ccNo:     String(r[1]||''),
          clusterNo:String(r[2]||''),
          leases:   String(r[3]||''),
          location: String(r[4]||'Riverbed'),
          distance: String(r[5]||''),
          village:  String(r[6]||''),
          area:     parseFloat(r[7])||0,
          mineral:  parseFloat(r[8])||0
        }));
        if (contData.length === 0) { alert('No valid rows found.'); return; }
        renderContigous();
        alert(`âœ… Loaded ${contData.length} contiguous cluster row(s) from Excel.`);
      }
    } catch(err) {
      alert('Error reading Excel file: ' + err.message);
    }
    event.target.value = ''; // reset input
  };
  reader.readAsBinaryString(file);
}
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   LEGACY FUNCTIONS (FOR BACKWARD COMPATIBILITY)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function addAnx3Row(tblId='anx3-clusters') {
  const tbody=document.querySelector('#'+tblId+' tbody');
  if (!tbody) return;
  tbody.insertAdjacentHTML('beforeend',`<tr>
    <td contenteditable="true">Sutlej</td><td contenteditable="true">${tbody.rows.length+1}</td>
    <td contenteditable="true">NPRO_JL_PL_ST_XX</td>
    <td><select><option>Riverbed</option><option>Patta Land</option></select></td>
    <td contenteditable="true">Village Name</td>
    <td contenteditable="true" oninput="calcClusterRow(this)">0</td>
    <td contenteditable="true" oninput="calcClusterRow(this)">0</td>
    <td class="anx3-mineral">0</td>
    <td><button class="btn btn-xs btn-danger" onclick="delRow(this)" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>
  </tr>`);
  if (window.initLucide) window.initLucide();
}
function addAnx3ContRow() {
  const tbody=document.querySelector('#anx3-contiguous tbody');
  if (!tbody) return;
  tbody.insertAdjacentHTML('beforeend',`<tr>
    <td contenteditable="true">Sutlej</td><td contenteditable="true">CC-${tbody.rows.length+1}</td>
    <td contenteditable="true">1,2,3</td><td contenteditable="true">9</td>
    <td><select><option>Riverbed</option><option>Patta Land</option></select></td>
    <td contenteditable="true">0.55km</td><td contenteditable="true">Village Name</td>
    <td contenteditable="true">0</td><td contenteditable="true">0</td>
    <td><button class="btn btn-xs btn-danger" onclick="delRow(this)" style="display:inline-flex;align-items:center;justify-content:center;padding:4px;"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button></td>
  </tr>`);
  if (window.initLucide) window.initLucide();
}
function calcClusterRow(el) {
  const row=el.closest('tr');
  const cells=row.querySelectorAll('td[contenteditable="true"]');
  const tds = row.querySelectorAll('td');
  const excav=parseFloat(tds[6]?.textContent)||0;
  const mineralCell=row.querySelector('.anx3-mineral');
  if (mineralCell) mineralCell.textContent=fmtN(excav*0.6,2);
}
window.renderCluster = renderCluster;
window.renderContiguous = renderContigous;
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PDF UPLOAD & MANAGEMENT (ANNEXURE III)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderPdfUploadUI() {
  const nameEl = document.getElementById('anx3-uploaded-filename');
  const dlBtn = document.getElementById('anx3-download-btn');
  const delBtn = document.getElementById('anx3-delete-btn');
  const previewBtn = document.getElementById('anx3-preview-btn');
  const previewSection = document.getElementById('pdf-preview-section-anx3');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx3') : document.getElementById('pdf-iframe-anx3'));
  if (!nameEl || !dlBtn) return;
  if (!S.activeProject) {
    nameEl.style.display = 'none';
    dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none';
    if (previewBtn) previewBtn.style.display = 'none';
    if (previewSection) previewSection.style.display = 'none';
    return;
  }
  const pdfName = S.activeProject.annexure3PdfName;
  if (!pdfName) {
    nameEl.style.display = 'none';
    dlBtn.style.display = 'none';
    if (delBtn) delBtn.style.display = 'none';
    if (previewBtn) previewBtn.style.display = 'none';
    if (previewSection) {
      previewSection.style.display = 'none';
      if (iframe) iframe.src = 'about:blank';
    }
  } else {
    nameEl.textContent = pdfName;
    nameEl.style.display = 'inline-block';
    dlBtn.style.display = 'inline-flex';
    if (delBtn) delBtn.style.display = !isUserReadOnly() ? 'inline-flex' : 'none';
    if (previewBtn) previewBtn.style.display = 'inline-flex';
    if (previewSection && previewSection.style.display === 'block' && iframe) {
      if (S.activeProject.pdfData && S.activeProject.pdfData.anx3) {
        if (iframe.src !== S.activeProject.pdfData.anx3) {
          iframe.src = S.activeProject.pdfData.anx3;
        }
      }
    }
  }
  if (window.initLucide) window.initLucide();
}
function togglePDFPreviewAnx3() {
  const previewSection = document.getElementById('pdf-preview-section-anx3');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx3') : document.getElementById('pdf-iframe-anx3'));
  if (!previewSection || !iframe) return;
  if (previewSection.style.display === 'block') {
    previewSection.style.display = 'none';
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  } else {
    if (S.activeProject && S.activeProject.pdfData && S.activeProject.pdfData.anx3) {
      iframe.src = S.activeProject.pdfData.anx3;
      previewSection.style.display = 'block';
    } else {
      toast('No PDF preview available. Please re-upload.', 'warn');
    }
  }
}
async function deletePdfAnx3() {
  if (!S.activeProject) return;
  if (!confirm("Are you sure you want to delete the uploaded PDF?")) {
    return;
  }
  const previewSection = document.getElementById('pdf-preview-section-anx3');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx3') : document.getElementById('pdf-iframe-anx3'));
  if (previewSection) previewSection.style.display = 'none';
  if (iframe) {
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  }
  S.activeProject.annexure3PdfName = null;
  if (S.activeProject.pdfData) S.activeProject.pdfData.anx3 = null;
  const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pIdx !== -1) {
    S.projects[pIdx].annexure3PdfName = null;
    if (S.projects[pIdx].pdfData) S.projects[pIdx].pdfData.anx3 = null;
  }
  renderPdfUploadUI();
  toast("PDF deleted successfully.", "success");
}
function handlePdfUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    toast('Error: Only PDF files are allowed.', 'danger');
    event.target.value = '';
    return;
  }
  toast('Uploading PDF...', 'info');
  const fileURL = URL.createObjectURL(file);
  S.activeProject.annexure3PdfName = file.name;
  if (!S.activeProject.pdfData) S.activeProject.pdfData = {};
  S.activeProject.pdfData.anx3 = fileURL;
  if (window.storeProjectPdf) {
    window.storeProjectPdf('anx3', file).catch(err => console.error('Backend PDF upload failed:', err));
  }
  if (window.renderPdfToImages) {
    window.renderPdfToImages(file, (err, imgs) => {
      if (!err && imgs) {
        if (!S.uploadedPDFs) S.uploadedPDFs = {};
        S.uploadedPDFs.anx3 = imgs;
        if (window.debouncedSaveState) window.debouncedSaveState();
      }
    });
  }
  const pIdx = S.projects.findIndex(p => p.id === S.activeProject.id);
  if (pIdx !== -1) {
    S.projects[pIdx].annexure3PdfName = file.name;
    if (!S.projects[pIdx].pdfData) S.projects[pIdx].pdfData = {};
    S.projects[pIdx].pdfData.anx3 = fileURL;
  }
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx3') : document.getElementById('pdf-iframe-anx3'));
  if (iframe) {
    iframe.src = fileURL;
  }
  renderPdfUploadUI();
  toast('PDF uploaded and preview loaded!', 'success');
  event.target.value = '';
}
function viewPdf() {
  if (S.activeProject && S.activeProject.pdfData && S.activeProject.pdfData.anx3) {
    window.open(S.activeProject.pdfData.anx3, '_blank');
  } else {
    toast('No PDF preview available. Please re-upload.', 'warn');
  }
}
function downloadPdf() {
  if (!S.activeProject) {
    toast('Please select and open a project first.', 'warn');
    return;
  }
  if (!S.activeProject.annexure3PdfName) {
    toast('No PDF has been uploaded for this project yet. Please upload a PDF first.', 'warn');
    return;
  }
  if (window.downloadStoredPdf) {
    downloadStoredPdf('anx3', S.activeProject.annexure3PdfName, S.activeProject.pdfData?.anx3);
    return;
  }
  const a = document.createElement('a');
  a.href = S.activeProject.pdfData.anx3;
  a.download = S.activeProject.annexure3PdfName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
function closePDFPreviewAnx3() {
  const previewSection = document.getElementById('pdf-preview-section-anx3');
  const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx3') : document.getElementById('pdf-iframe-anx3'));
  if (previewSection) previewSection.style.display = 'none';
  if (iframe) {
    if (iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    iframe.src = 'about:blank';
  }
}
function exportAnx3PDF(btn, isLivePreview = false) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'pt', 'a4'); 
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let startY = 80;
  const district = S.activeProject ? S.activeProject.district : 'JALANDHAR';
  const districtUpper = district.toUpperCase();
  const drawHeaderFooter = (data) => {
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Page " + data.pageNumber, pageWidth / 2, pageHeight - 20, { align: "center" });
  };
  const getCellTextLocal = (td) => {
    const select = td.querySelector('select');
    if (select) return select.value;
    return td.innerText.trim();
  };
  const extractData = (tableId) => {
    const tbl = document.getElementById(tableId);
    if (!tbl) return { headers: [], rows: [] };
    const headers = Array.from(tbl.querySelectorAll('thead th')).slice(0, -1).map(th => th.innerText.trim().replace(/\n/g, ' '));
    const rows = [];
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const row = [];
      const tds = tr.querySelectorAll('td');
      for (let i = 0; i < tds.length - 1; i++) {
        row.push(getCellTextLocal(tds[i]));
      }
      rows.push(row);
    });
    const tfoot = tbl.querySelector('tfoot');
    if (tfoot) {
      tfoot.querySelectorAll('tr').forEach(tr => {
        const row = [];
        const tds = tr.querySelectorAll('td');
        for (let i = 0; i < tds.length; i++) {
          const colSpan = parseInt(tds[i].getAttribute('colspan') || '1');
          row.push(tds[i].innerText.trim());
          for (let c = 1; c < colSpan; c++) {
            row.push('');
          }
        }
        if (row.length > headers.length) {
          rows.push(row.slice(0, headers.length));
        } else {
          rows.push(row);
        }
      });
    }
    return { headers, rows };
  };
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Annexure-III", pageWidth - 40, 55, { align: "right" });
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("> a) Cluster Details:", 40, startY);
  startY += 15;
  const clusterDataPdf = extractData('anx3-clusters');
  doc.autoTable({
    startY: startY,
    head: [clusterDataPdf.headers],
    body: clusterDataPdf.rows,
    theme: 'grid',
    styles: { font: 'times', fontSize: 8, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 4, valign: 'middle', halign: 'center' },
    headStyles: { fillColor: false, fontStyle: 'bold', halign: 'center', textColor: 0 },
    didDrawPage: (data) => drawHeaderFooter(data)
  });
  startY = doc.lastAutoTable.finalY + 30;
  if (startY > pageHeight - 120) {
    doc.addPage();
    startY = 80;
  }
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("> b) Contiguous Clusters:", 40, startY);
  startY += 15;
  const contDataPdf = extractData('anx3-contiguous');
  doc.autoTable({
    startY: startY,
    head: [contDataPdf.headers],
    body: contDataPdf.rows,
    theme: 'grid',
    styles: { font: 'times', fontSize: 8, textColor: 0, lineColor: 0, lineWidth: 0.5, cellPadding: 4, valign: 'middle', halign: 'center' },
    headStyles: { fillColor: false, fontStyle: 'bold', halign: 'center', textColor: 0 },
    didDrawPage: (data) => drawHeaderFooter(data)
  });
  if (isLivePreview) {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = (window.getAnnexurePreviewIframe ? window.getAnnexurePreviewIframe('anx3') : document.getElementById('pdf-iframe-anx3'));
    if (iframe) iframe.src = blobUrl;
  } else {
    doc.save('Annexure_III_Cluster_Details.pdf');
    toast('PDF downloaded successfully!', 'success');
  }
}
/* â”€â”€â”€ DOMContentLoaded initialization â”€â”€â”€ */
window.addEventListener('DOMContentLoaded', () => {
  renderCluster();
  renderContigous();
  renderPdfUploadUI();
});
document.addEventListener('input', (e) => {
  if (e.target.closest('#view-anx3 table')) {
    if (window.anx3DebounceTimer) clearTimeout(window.anx3DebounceTimer);
    window.anx3DebounceTimer = setTimeout(() => {
       exportAnx3PDF(null, true);
    }, 1500); // 1.5 seconds after typing stops
  }
});
document.addEventListener('change', (e) => {
  if (e.target.closest('#view-anx3 table')) {
    if (window.anx3DebounceTimer) clearTimeout(window.anx3DebounceTimer);
    window.anx3DebounceTimer = setTimeout(() => {
      exportAnx3PDF(null, true);
    }, 300);
  }
});
window.exportAnx3PDF = exportAnx3PDF;
