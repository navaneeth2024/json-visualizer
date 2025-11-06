const themeToggle=document.getElementById('themeToggle');
const menuBtn=document.getElementById('menuBtn');
const menu=document.getElementById('menu');
themeToggle.addEventListener('click',()=>{
  const t=document.body.getAttribute('data-theme');
  document.body.setAttribute('data-theme',t==='light'?'dark':'light');
  localStorage.setItem('theme',document.body.getAttribute('data-theme'));
});
if(localStorage.getItem('theme'))
  document.body.setAttribute('data-theme',localStorage.getItem('theme'));
menuBtn.addEventListener('click',()=>menu.classList.toggle('hidden'));
document.addEventListener('click',(e)=>{
  if(!menu.contains(e.target)&&e.target!==menuBtn)menu.classList.add('hidden');
});

let currentPage=1,rowsPerPage=25,tableData=[],filteredData=[],columns=[],timestampToggle=false;
const fileInput=document.getElementById('jsonFile'),fileName=document.getElementById('fileName');
const output=document.getElementById('output'),tableContainer=document.getElementById('tableContainer');
const pagination=document.getElementById('pagination'),prevBtn=document.getElementById('prevBtn');
const nextBtn=document.getElementById('nextBtn'),pageInfo=document.getElementById('pageInfo');
const rowsPerPageSelect=document.getElementById('rowsPerPage'),gotoPage=document.getElementById('gotoPage');
const gotoBtn=document.getElementById('gotoBtn'),searchInput=document.getElementById('searchInput');
const datasetSelector=document.getElementById('datasetSelector'),datasetSelect=document.getElementById('datasetSelect');
const toast=document.getElementById('toast');

function showToast(msg){
  toast.textContent=msg;
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'),2000);
}

fileInput.addEventListener('change',async(e)=>{
  const file=e.target.files[0];if(!file)return;
  fileName.textContent=`Loaded: ${file.name}`;
  try{
    const text=await file.text();
    const json=JSON.parse(text);
    const keys=Object.keys(json).filter(k=>Array.isArray(json[k]));
    if(keys.length>1){
      datasetSelector.classList.remove('hidden');
      datasetSelect.innerHTML=keys.map(k=>`<option value="${k}">${k}</option>`).join('');
      datasetSelect.onchange=()=>loadDataset(json[datasetSelect.value]);
      loadDataset(json[keys[0]]);
    }else if(keys.length===1){loadDataset(json[keys[0]]);}else{loadDataset(json);}
  }catch(err){showToast('Invalid JSON');}
});

// Store original order for reset
let originalData = [];
let currentSort = { col: null, order: null };

// Helper: deep copy array of objects
function deepCopyRows(arr) {
  return arr.map(row => ({...row}));
}

function loadDataset(data){
  const extracted=extractRecords(data);
  tableData=extracted;filteredData=extracted;
  columns=[...new Set(extracted.flatMap(r=>Object.keys(r)))];
  currentPage=1;
  // Save original order for reset
  originalData = deepCopyRows(tableData);
  currentSort = { col: null, order: null };
  renderTable();
}
rowsPerPageSelect.addEventListener('change',()=>{rowsPerPage=parseInt(rowsPerPageSelect.value);currentPage=1;renderTable();});
gotoBtn.addEventListener('click',()=>{const t=parseInt(gotoPage.value);const total=Math.ceil(filteredData.length/rowsPerPage);
  if(!isNaN(t)&&t>=1&&t<=total){currentPage=t;renderTable();}});
searchInput.addEventListener('input',()=>{const q=searchInput.value.toLowerCase();
  filteredData=tableData.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(q)));
  currentPage=1;renderTable();});

function extractRecords(json){let records=[];function explore(v){if(Array.isArray(v)){v.forEach(i=>{const f=flatten(i);if(Object.keys(f).length>0)records.push(f);});}
else if(typeof v==='object'&&v!==null){Object.values(v).forEach(explore);}}
explore(json);if(records.length===0&&typeof json==='object')records.push(flatten(json));return records;}
function flatten(o,res={}){if(typeof o!=='object'||o===null)return res;
for(const k in o){if(!Object.prototype.hasOwnProperty.call(o,k))continue;const v=o[k];
if(k==='string_list_data'&&Array.isArray(v)){v.forEach(i=>{if(typeof i==='object')for(const s in i)res[s]=i[s];});}
else if(k==='string_map_data'&&typeof v==='object'){for(const s in v){if(v[s]&&typeof v[s]==='object'&&'value'in v[s])res[s]=v[s]['value'];}}
else if(Array.isArray(v)){v.forEach(i=>{if(typeof i==='object')flatten(i,res);});}
else if(typeof v==='object'&&v!==null){flatten(v,res);}else res[k]=v;}return res;}

function renderTable(){
  output.classList.remove('hidden');
  pagination.classList.remove('hidden');
  // Hide dummy table when real data is shown
  var dummy = document.getElementById('dummyTable');
  if (dummy) dummy.style.display = 'none';
  tableContainer.innerHTML='';
  const totalPages=Math.ceil(filteredData.length/rowsPerPage);
  const start=(currentPage-1)*rowsPerPage;const end=start+rowsPerPage;let rows=filteredData.slice(start,end);
  if(timestampToggle){rows=rows.map(r=>{const o={...r};for(const k in o){if(/timestamp/i.test(k)&&!isNaN(o[k])){o[k]=new Date(parseInt(o[k])*1000).toLocaleString();}}return o;});}
  const headers=columns.map(c=>
    `<th style="white-space:nowrap;">
      <span>${c}</span>
      <span class='copy-btn' style="margin-left:6px;" onclick="copyColumn('${c}',event)">📋</span>
      <span class='sort-btn' style="margin-left:8px;cursor:pointer;opacity:0.7;font-size:15px;" title="Sort" data-col="${c}">⇅</span>
    </th>`
  ).join('');


  // Use event delegation for sort buttons
  tableContainer.onclick = function(e) {
    const btn = e.target.closest('.sort-btn');
    if (btn) {
      e.stopPropagation();
      showSortPopup(btn.getAttribute('data-col'), btn);
    }
  };

// Show sort popup
function showSortPopup(col, btn) {
  const popup = document.getElementById('sortPopup');
  const sortColName = document.getElementById('sortColName');
  const sortForm = document.getElementById('sortForm');
  const radios = popup.querySelectorAll('.sortRadio');
  // Position popup near button
  const rect = btn.getBoundingClientRect();
  popup.style.left = (rect.left + window.scrollX) + 'px';
  popup.style.top = (rect.bottom + window.scrollY + 6) + 'px';
  popup.classList.remove('hidden');
  sortColName.textContent = col;
  // Set radio state
  radios.forEach(r => r.checked = false);
  if (currentSort.col === col && currentSort.order) {
    popup.querySelector(`input[value="${currentSort.order}"]`).checked = true;
  }
  // Radio click logic
  radios.forEach(radio => {
    radio.onclick = function() {
      // Sort
      currentSort = { col, order: radio.value };
      filteredData = deepCopyRows(originalData);
      filteredData.sort((a, b) => {
        const va = a[col] ?? '';
        const vb = b[col] ?? '';
        if (radio.value === 'asc') return String(va).localeCompare(String(vb));
        else return String(vb).localeCompare(String(va));
      });
      renderTable();
      popup.classList.add('hidden');
    };
  });
  // Indicate selected radio visually (bold label)
  radios.forEach(radio => {
    radio.addEventListener('change', function() {
      radios.forEach(r => r.parentElement.classList.remove('font-bold'));
      if (radio.checked) radio.parentElement.classList.add('font-bold');
    });
    // Set initial state
    if (radio.checked) radio.parentElement.classList.add('font-bold');
    else radio.parentElement.classList.remove('font-bold');
  });
  // Clear sort button
  document.getElementById('clearSortPopup').onclick = function() {
    currentSort = { col: null, order: null };
    filteredData = deepCopyRows(originalData);
    renderTable();
    popup.classList.add('hidden');
  };
}

// Hide popup on outside click
document.addEventListener('mousedown', function(e) {
  const popup = document.getElementById('sortPopup');
  if (!popup.classList.contains('hidden') && !popup.contains(e.target)) {
    popup.classList.add('hidden');
  }
});

fileInput.addEventListener('change',async(e)=>{
  const file=e.target.files[0];if(!file)return;
  fileName.textContent=`Loaded: ${file.name}`;
  try{
    const text=await file.text();
    const json=JSON.parse(text);
    const keys=Object.keys(json).filter(k=>Array.isArray(json[k]));
    if(keys.length>1){
      datasetSelector.classList.remove('hidden');
      datasetSelect.innerHTML=keys.map(k=>`<option value="${k}">${k}</option>`).join('');
      datasetSelect.onchange=()=>loadDataset(json[datasetSelect.value]);
      loadDataset(json[keys[0]]);
    }else if(keys.length===1){loadDataset(json[keys[0]]);}else{loadDataset(json);}
    // Save original order for reset
    originalData = deepCopyRows(tableData);
    currentSort = { col: null, order: null };
  }catch(err){showToast('Invalid JSON');}
});

function loadDataset(data){
  const extracted=extractRecords(data);
  tableData=extracted;filteredData=extracted;
  columns=[...new Set(extracted.flatMap(r=>Object.keys(r)))];
  currentPage=1;
  // Save original order for reset
  originalData = deepCopyRows(tableData);
  currentSort = { col: null, order: null };
  renderTable();
}

// Also reset sort and originalData on clear
document.getElementById('clearData').onclick=()=>{
  tableData = [];
  filteredData = [];
  columns = [];
  currentPage = 1;
  originalData = [];
  currentSort = { col: null, order: null };
  if (output) output.classList.remove('hidden');
  var dummy = document.getElementById('dummyTable');
  if (dummy) dummy.style.display = '';
  if (tableContainer) tableContainer.innerHTML = '';
  if (pagination) pagination.classList.add('hidden');
  fileName.textContent = '';
  datasetSelector.classList.add('hidden');
  showToast('Data cleared!');
};
  const body=rows.map(r=>`<tr>${columns.map(c=>`<td>${highlight(String(r[c]??''))}</td>`).join('')}</tr>`).join('');
  tableContainer.innerHTML=`<table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>`;
  pageInfo.textContent=`Page ${currentPage} of ${totalPages} — Showing ${rows.length} of ${filteredData.length}`;
  prevBtn.disabled=currentPage===1;nextBtn.disabled=currentPage===totalPages||totalPages===0;
}

// Show dummy table on load
window.addEventListener('DOMContentLoaded', function() {
  var output = document.getElementById('output');
  var dummy = document.getElementById('dummyTable');
  var tableContainer = document.getElementById('tableContainer');
  if (dummy) dummy.style.display = '';
  if (tableContainer) tableContainer.innerHTML = '';
});
function highlight(t){const q=searchInput.value.trim();if(!q)return t;const r=new RegExp('('+q.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')+')','gi');
return t.replace(r,'<mark class="mark">$1</mark>');}
function copyColumn(c,e){e.stopPropagation();const vals=filteredData.map(r=>r[c]??'').join('\n');navigator.clipboard.writeText(c+'\n'+vals);showToast(`Copied "${c}" column!`);}
prevBtn.onclick=()=>{if(currentPage>1){currentPage--;renderTable();}};nextBtn.onclick=()=>{const t=Math.ceil(filteredData.length/rowsPerPage);if(currentPage<t){currentPage++;renderTable();}};
document.getElementById('downloadCSV').onclick=()=>downloadFile('csv');
document.getElementById('downloadJSON').onclick=()=>downloadFile('json');
document.getElementById('toggleTimestamps').onclick=()=>{timestampToggle=!timestampToggle;renderTable();};
document.getElementById('toggleColumns').onclick=toggleColumns;
document.getElementById('resetPrefs').onclick=()=>{localStorage.clear();showToast('Preferences cleared!');};
document.getElementById('clearData').onclick=()=>{
  // Reset all data and show dummy table
  tableData = [];
  filteredData = [];
  columns = [];
  currentPage = 1;
  // Hide real table, show dummy
  if (output) output.classList.remove('hidden');
  var dummy = document.getElementById('dummyTable');
  if (dummy) dummy.style.display = '';
  if (tableContainer) tableContainer.innerHTML = '';
  if (pagination) pagination.classList.add('hidden');
  fileName.textContent = '';
  datasetSelector.classList.add('hidden');
  showToast('Data cleared!');
};
function downloadFile(type){let data;if(type==='json'){data=JSON.stringify(filteredData,null,2);saveFile(data,'data.json','application/json');}
else{const csv=[columns.join(',')].concat(filteredData.map(r=>columns.map(c=>JSON.stringify(r[c]??'')).join(','))).join('\n');saveFile(csv,'data.csv','text/csv');}
showToast(`Downloaded as ${type.toUpperCase()}`);}
function saveFile(content,name,mime){const blob=new Blob([content],{type:mime});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();}
function toggleColumns(){const menu=document.createElement('div');menu.className='fixed inset-0 bg-black/30 flex justify-center items-center z-50';
menu.innerHTML=`<div class='mui-card p-6'><h3 class='mb-3 font-semibold'>Toggle Columns</h3>${columns.map(c=>`<label class='block'><input type='checkbox' checked data-col='${c}'/> ${c}</label>`).join('')}<div class='mt-4 flex justify-end'><button id='applyCols' class='btn'>Apply</button></div></div>`;
document.body.appendChild(menu);menu.querySelector('#applyCols').onclick=()=>{const checks=menu.querySelectorAll('input[type=checkbox]');
columns=[...checks].filter(ch=>ch.checked).map(ch=>ch.dataset.col);menu.remove();renderTable();};}
