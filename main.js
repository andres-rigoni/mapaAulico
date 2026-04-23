/* © 2026 Andrés Iván Rigoni González / Gamiori - Todos los derechos reservados. */

// main.js - datos y lógica (modificá aquí si querés)
(() => {
  // ---------- CONFIG ----------
  const STORAGE_KEY = 'aulico_v1';

  const CONFIG_KEY = 'aulico_config';

  let config = {
    precision: 50,
    theme: "light"
  };

  const YEARS = [
    "1er grado","2do grado","3er grado","4to grado","5to grado","6to grado",
    "1er año","2do año","3er año","4to año","5to año","6to año"
  ];

  let school = {};
  let currentYear = null;
  let currentDivision = null;
  let currentSaved = false;

  const btnSaveFile = document.getElementById('btnSaveFile');
  const btnLoadFile = document.getElementById('btnLoadFile');

  function saveToFile(){

    const data = {
      school,
      seed: rngSeed,
      config
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "aulico_backup.json";
    a.click();

    URL.revokeObjectURL(url);
  }

  function loadFromFile(){

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = e => {
      const file = e.target.files[0];
      if(!file) return;

      const reader = new FileReader();

      reader.onload = ev => {
        try{
          const data = JSON.parse(ev.target.result);

          // 🟢 CASO 1: colegio completo
          if(data.school){

            school = data.school;
            if(data.seed) rngSeed = data.seed;
            if(data.config) config = data.config;

            persistSchool();
            saveConfig();
            renderYears();

            alert("Colegio completo cargado");
            return;
          }

          // 🟡 CASO 2: mapa áulico / división
          if(data.students && data.assignment){

            if(!currentYear || !currentDivision){
              alert("Abrí una división primero");
              return;
            }

            const d = ensureDivision(currentYear, currentDivision);

            d.students = data.students;
            d.assignment = data.assignment;
            d.bankLayout = data.bankLayout || clone(DEFAULT_LAYOUT);
            d.saved = false;

            // actualizar vista actual
            students = clone(d.students);
            currentAssignment = clone(d.assignment);
            bankLayout = clone(d.bankLayout);

            rebuildSeatMap();
            renderSeatGrid(currentAssignment);

            persistSchool();
            renderYears();

            alert("Mapa áulico cargado en la división actual");
            return;
          }

          alert("Formato de archivo no reconocido");

        }catch(err){
          alert("Archivo inválido");
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }

  btnSaveFile.addEventListener("click", saveToFile);
  btnLoadFile.addEventListener("click", loadFromFile);

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function ensureYear(year){
    if(!school[year]){
      school[year] = { divisions: {}, open: false };
    }
    if(!school[year].divisions){
      school[year].divisions = {};
    }
    return school[year];
  }

  function ensureDivision(year, division){
    ensureYear(year);

    if(!school[year].divisions[division]){
      school[year].divisions[division] = {
        students: [],
        assignment: null,
        bankLayout: clone(DEFAULT_LAYOUT),
        saved: false
      };
    }

    const d = school[year].divisions[division];

    if(!Array.isArray(d.students)) d.students = [];
    if(!Array.isArray(d.bankLayout?.[0])) d.bankLayout = clone(DEFAULT_LAYOUT);
    if(d.assignment && !Array.isArray(d.assignment)) d.assignment = null;
    if(typeof d.saved !== "boolean") d.saved = false;

    return d;
  }

  function saveCurrentDivision(){
    if(currentYear === null || currentDivision === null) return;

    const d = ensureDivision(currentYear, currentDivision);
    d.students = clone(students);
    d.assignment = currentAssignment ? clone(currentAssignment) : null;
    d.bankLayout = clone(bankLayout);
  }

  function persistSchool(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      school,
      seed: rngSeed
    }));
  }

  const yearsList = document.getElementById("yearsList");

  function renderYears(){

    yearsList.innerHTML = "";

    YEARS.forEach(year => {

      if(!school[year]){
        school[year] = { divisions:{}, open:false };
      }

      const container = document.createElement("div");
      container.className = "year";

      const header = document.createElement("div");
      header.className = "year-header";

      const title = document.createElement("span");
      title.textContent = year;

      const btnAdd = document.createElement("button");
      btnAdd.textContent = "+";

      btnAdd.onclick = (e)=>{
        e.stopPropagation();
        createDivision(year);
      };

      header.appendChild(title);
      header.appendChild(btnAdd);

      header.onclick = ()=>{
        school[year].open = !school[year].open;
        renderYears();
      };

      container.appendChild(header);

      if(school[year].open){

        const divs = school[year].divisions;

        Object.keys(divs)
        .sort((a,b)=>a.localeCompare(b))
        .forEach(name => {

          const d = document.createElement("div");
          d.className = "division";

          d.style.cursor = "pointer";

          d.onclick = () => {
            openDivision(year, name);
          };

          d.oncontextmenu = (e)=>{
            e.preventDefault();
            showDivisionMenu(e, year, name);
          };

          if(divs[name].saved) d.classList.add("saved");

          const label = document.createElement("span");
          label.textContent = `${year} ${name}`;

          label.onclick = ()=>{
            openDivision(year, name);
          };

          const controls = document.createElement("div");

          const btnRename = document.createElement("button");
          btnRename.textContent = "✏️";

          btnRename.onclick = ()=>{
            const newName = prompt("Nuevo nombre", name);
            if(!newName) return;

            if(divs[newName]){
              alert("ya hay una división con ese nombre");
              return;
            }

            divs[newName] = divs[name];
            delete divs[name];

            persistSchool();
            renderYears();
          };

          const btnDelete = document.createElement("button");
          btnDelete.textContent = "❌";

          btnDelete.onclick = ()=>{
            if(confirm("Eliminar división?")){
              delete divs[name];
              persistSchool();
              renderYears();
            }
          };

          //controls.appendChild(btnRename);
          //controls.appendChild(btnDelete);

          d.appendChild(label);
          //d.appendChild(controls);

          container.appendChild(d);

        });

      }

      yearsList.appendChild(container);
    });
  }

  function openExportModal(targetAssignment, targetStudents){

    const old = document.getElementById("exportModal");
    if(old) old.remove();

    const modal = document.createElement("div");
    modal.id = "exportModal";
    modal.className = "modal";

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Exportar</h3>
          <button id="closeExport" class="close-btn">Cerrar ✕</button>
        </div>

        <div class="modal-body" style="display:flex;flex-direction:column;gap:10px">

          <button id="expExcel">📊 Excel</button>
          <button id="expPDF">📄 PDF</button>
          <button id="expJSON">{ } JSON</button>

        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("closeExport").onclick = ()=>modal.remove();

    document.getElementById("expExcel").onclick = ()=>{
      exportCSV(targetAssignment, targetStudents);
      modal.remove();
    };

    document.getElementById("expPDF").onclick = ()=>{
      exportPDF(targetAssignment, targetStudents);
      modal.remove();
    };

    document.getElementById("expJSON").onclick = ()=>{

      const data = {
        students: targetStudents,
        assignment: targetAssignment,
        bankLayout: bankLayout
      };

      const blob = new Blob([JSON.stringify(data,null,2)]);
      downloadBlob(blob, "mapa_aulico.json");

      modal.remove();
    };
  }

  function downloadBlob(blob,name){
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  }

  function duplicateDivision(year,name){
    const divs = school[year].divisions;

    let newName = name + "_copy";
    let i = 1;

    while(divs[newName]){
      newName = name + "_copy" + i++;
    }

    divs[newName] = clone(divs[name]);

    persistSchool();
    renderYears();
  }

  function renameDivision(year,name){
    const divs = school[year].divisions;

    const newName = prompt("Nuevo nombre", name);
    if(!newName || divs[newName]) return;

    divs[newName] = divs[name];
    delete divs[name];

    persistSchool();
    renderYears();

    if(currentDivision === name){
      currentDivision = newName;
    }
  }

  function deleteDivision(year,name){
    if(!confirm("Eliminar división?")) return;

    delete school[year].divisions[name];

    persistSchool();
    renderYears();
  }

  function downloadDivision(year,name){
    const data = school[year].divisions[name];

    const blob = new Blob([JSON.stringify(data,null,2)]);
    const a = document.createElement("a");

    a.href = URL.createObjectURL(blob);
    a.download = `${year}_${name}.json`;
    a.click();
  }


  
  function showDivisionMenu(e, year, name){

    const old = document.getElementById("contextMenu");
    if(old) old.remove();

    const menu = document.createElement("div");
    menu.id = "contextMenu";

    menu.style.position = "fixed";
    menu.style.top = e.clientY + "px";
    menu.style.left = e.clientX + "px";
    if(document.body.classList.contains("dark")){
      menu.style.background = "#2a2a2a";
      menu.style.color = "#eee";
      menu.style.border = "1px solid #555";
    }else{
      menu.style.background = "#fff";
      menu.style.border = "1px solid #ccc";
    }
    menu.style.borderRadius = "6px";
    menu.style.padding = "6px";
    menu.style.zIndex = 9999;
    function getRealName(){
      return name in school[year].divisions ? name : Object.keys(school[year].divisions).find(n => n === name) || name;
    }
    const options = [
      ["Abrir", ()=>openDivision(year,name)],
      ["Duplicar", ()=>duplicateDivision(year,name)],
      ["Renombrar", ()=>{
        renameDivision(year,name);
      }],
      ["Exportar", ()=>{
        const data = school[year].divisions[name];
        openExportModal(data.assignment, data.students);
      }],
      ["Eliminar", ()=>deleteDivision(year,name)]
    ];

    options.forEach(([text,fn])=>{
      const item = document.createElement("div");
      item.textContent = text;
      item.style.padding = "6px";
      item.style.cursor = "pointer";

      item.onmouseover = ()=>{
        item.style.background = document.body.classList.contains("dark") ? "#444" : "#eee";
      };

      item.onmouseleave = ()=>{
        item.style.background = "transparent";
      };

      item.onclick = ()=>{
        fn();
        menu.remove();
      };

      menu.appendChild(item);
    });

    document.body.appendChild(menu);

    document.addEventListener("click", ()=>menu.remove(), {once:true});
  }

  function createDivision(year){
    const divs = ensureYear(year).divisions;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    let i = 0;
    while(divs[letters[i]]) i++;

    const name = letters[i];

    divs[name] = {
      students: (year === "3er año" && name === "A") ? clone(DEFAULT_STUDENTS_3A) : [],
      assignment: null,
      bankLayout: clone(DEFAULT_LAYOUT),
      saved: false
    };

    school[year].open = true;
    persistSchool();
    renderYears();
  }

  function openDivision(year, name){
    if(currentYear !== null && currentDivision !== null){
      saveCurrentDivision();
    }

    const data = ensureDivision(year, name);

    currentYear = year;
    currentDivision = name;

    students = clone(data.students);
    currentAssignment = data.assignment ? clone(data.assignment) : null;

    bankLayout = clone(data.bankLayout);
    rebuildSeatMap();
    updateGridTemplate();

    document.querySelector(".center h2").textContent = `Aula de ${year} ${name}`;

    renderSeatGrid(currentAssignment);
    renderYears();
  }

  const legendBox = document.getElementById("legendBox");

  function renderLegend(){

    legendBox.innerHTML = `
      <span class="pill">👓 lentes</span>
      <span class="pill">1️⃣ primera fila</span>
      <span class="pill">⚠️ indisciplina</span>
      <button id="btnDone" style="background:green;color:white;border:none;padding:6px 10px;border-radius:6px;">LISTO</button>
    `;

    document.getElementById("btnDone").onclick = ()=>{

      if(!currentYear || !currentDivision) return;

      const data = ensureDivision(currentYear, currentDivision);

      data.students = clone(students);
      data.assignment = currentAssignment ? clone(currentAssignment) : null;
      data.bankLayout = clone(bankLayout);
      data.saved = true;

      persistSchool();
      renderYears();
    };
  }
  
  const btnManageStudents = document.getElementById("btnManageStudents");
  const studentsModal = document.getElementById("studentsModal");
  const closeStudents = document.getElementById("closeStudents");
  const studentsAdminList = document.getElementById("studentsAdminList");
  const addStudentBtn = document.getElementById("addStudent");
  



  const btnBanks = document.getElementById("btnFutureBanks");
  let editingBanks = false;
  let tempLayout = null;

  let rngSeed = Math.floor(Math.random()*1e9);
  function rand() { // simple LCG
    rngSeed = (1103515245 * rngSeed + 12345) % 2147483648;
    return rngSeed / 2147483648;
  }

  // Distancias Manhattan en la cuadrícula (col,row)
  function manhattan(a,b){ return Math.abs(a.col - b.col) + Math.abs(a.row - b.row); }

  function sameDesk(a,b){
    if(a.row !== b.row) return false;

    const pairs = [
      [1,2],
      [3,4],
      [5,6]
    ];

    return pairs.some(p => p.includes(a.col) && p.includes(b.col));
  }

  // ---------- ASIENTOS: 6x6 (2 bancos, pasillo, 2 bancos, pasillo, 2 bancos) ----------

  const DEFAULT_LAYOUT = [
    [1,1,0,1,1,0,1,1],
    [1,1,0,1,1,0,1,1],
    [1,1,0,1,1,0,1,1],
    [1,1,0,1,1,0,1,1],
    [1,1,0,1,1,0,1,1],
    [1,1,0,1,1,0,1,1],
  ];

  let bankLayout = clone(DEFAULT_LAYOUT);
  function updateGridTemplate(){
    const cols = bankLayout[0].length;
    seatsGrid.style.gridTemplateColumns = `repeat(${cols}, var(--seat-size))`;
  }
  let seatMap = [];

  function rebuildSeatMap(){
    seatMap = [];
    let sid = 1;

    for(let row=0; row<bankLayout.length; row++){
      for(let col=0; col<bankLayout[row].length; col++){

        if(bankLayout[row][col] === 1){
          seatMap.push({
            id: sid++,
            gridCol: col+1,
            gridRow: row+1,
            col: col+1,
            row: row+1
          });
        }

      }
    }
  }

  rebuildSeatMap();

  // modo editor

  btnBanks.addEventListener("click", () => {

    const size = prompt("Ingresá tamaño de la cuadrícula (ej: 6x8)");
    if(!size) return;

    const [rows, cols] = size.toLowerCase().split("x").map(Number);
    if(!rows || !cols) return alert("Formato inválido");

    tempLayout = Array.from({length: rows}, () => Array(cols).fill(0));

    openBankEditor();
  });

  function openBankEditor(){
    editingBanks = true;

    document.querySelector(".center h2").textContent = "Bancos";

    renderBankEditor();

    document.querySelector(".legend").innerHTML = `
      <button id="btnCancelBanks">Cancelar</button>
      <button id="btnSaveBanks">Guardar</button>
    `;

    document.getElementById("btnCancelBanks").onclick = closeBankEditor;
    document.getElementById("btnSaveBanks").onclick = saveBankEditor;
  }

  function renderBankEditor(){
    seatsGrid.innerHTML = "";

    seatsGrid.style.gridTemplateColumns = `repeat(${tempLayout[0].length}, var(--seat-size))`;

    tempLayout.forEach((row, r) => {
      row.forEach((cell, c) => {

        const div = document.createElement("div");
        div.className = "seat";

        if(cell === 1){
          div.style.background = "#bde7ff";
          div.textContent = "Banco";
        }

        div.addEventListener("click", () => {
          tempLayout[r][c] = tempLayout[r][c] ? 0 : 1;
          renderBankEditor();
        });

        seatsGrid.appendChild(div);

      });
    });
  }

  function closeBankEditor(){
    editingBanks = false;

    document.querySelector(".center h2").textContent = "Aula (vista)";

    document.querySelector(".legend").innerHTML = `
      <span class="pill">👓 lentes</span>
      <span class="pill">1️⃣ primera fila</span>
      <span class="pill">⚠️ indisciplina</span>
    `;

    renderSeatGrid(currentAssignment);
  }

  function saveBankEditor(){
    bankLayout = tempLayout;
    saveCurrentDivision();
    persistSchool();
    rebuildSeatMap();
    closeBankEditor();
  }

  // alumnos

  btnManageStudents.addEventListener("click", openStudentsModal);
  closeStudents.addEventListener("click", closeStudentsModal);

  function openStudentsModal(){
    renderStudentsAdmin();
    studentsModal.classList.remove("hidden");
  }

  function closeStudentsModal(){
    studentsModal.classList.add("hidden");
  }
  
  function getSurname(fullName){
    const parts = fullName.trim().split(/\s+/);
    return parts.slice(1).join(" ") || parts[0];
  }

  function renderStudentsAdmin(){

    // ordenar por apellido
    students.sort((a,b)=>{
      return getSurname(a.name).localeCompare(getSurname(b.name));
    });

    // re-asignar IDs según orden

    studentsAdminList.innerHTML = "";

    students.forEach(s => {
      const li = document.createElement("li");

      li.innerHTML = `
        <div class="student-row">

          <input type="text" value="${s.name}" data-id="${s.id}" class="admin-name"/>

          <div class="student-flags">
            <label><input type="checkbox" data-flag="glasses" data-id="${s.id}" ${s.flags.glasses?"checked":""}/>👓</label>
            <label><input type="checkbox" data-flag="disability" data-id="${s.id}" ${s.flags.disability?"checked":""}/>1️⃣</label>
            <label><input type="checkbox" data-flag="misbehave" data-id="${s.id}" ${s.flags.misbehave?"checked":""}/>⚠️</label>
          </div>

          <input type="email" value="${s.email || ""}" placeholder="mail" data-id="${s.id}" class="admin-email"/>

          <button data-id="${s.id}" class="delete-student">❌</button>
        </div>
      `;

      studentsAdminList.appendChild(li);
    });
  }

  studentsAdminList.addEventListener("input", e => {
    const id = parseInt(e.target.dataset.id);
    const s = students.find(x=>x.id===id);

    if(e.target.classList.contains("admin-name")){
      s.name = e.target.value;
    }

    if(e.target.classList.contains("admin-email")){
      s.email = e.target.value;
    }

    saveAllToLocalStorage();
  });

  studentsAdminList.addEventListener("change", e => {
    const id = parseInt(e.target.dataset.id);
    const s = students.find(x=>x.id===id);

    if(e.target.dataset.flag){
      s.flags[e.target.dataset.flag] = e.target.checked;
    }

    saveAllToLocalStorage();
  });

  studentsAdminList.addEventListener("click", e => {
    if(e.target.classList.contains("delete-student")){
      const id = parseInt(e.target.dataset.id);

      const index = students.findIndex(s=>s.id===id);
      if(index !== -1){
        students.splice(index,1);
        renderStudentsAdmin();
        saveAllToLocalStorage();
      }
    }
  });
  
  function getNextId(){
    return Math.max(0, ...students.map(s=>s.id)) + 1;
  }

  addStudentBtn.addEventListener("click", ()=>{
    students.push({
      id: getNextId(),
      name: "Nuevo Alumno",
      email: "",
      flags:{glasses:false,disability:false,misbehave:false},
      prefs:{pair:0,near:0,dislike:0}
    });

    renderStudentsAdmin();
    saveAllToLocalStorage();
  });

  // seat extra in row 1, right aisle -> grid column 7 (we use it as column 8 index)

  // ---------- ALUMNOS ----------
  // inicial students (preferencias por defecto 0)

  const DEFAULT_STUDENTS_3A = [
    { id:1, name:"Sofía Acuña", email:"acuna.sofia@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:5,near:29,dislike:20} },
    { id:2, name:"María Alvarez", email:"maria.alvarez@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:30,near:28,dislike:0} },
    { id:3, name:"Bárbara Armando", email:"barbara.armando@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:0,near:0,dislike:0} },
    { id:4, name:"Gabriel Badaro", email:"badaro.gabriel@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:true}, prefs:{pair:22,near:11,dislike:35} },
    { id:5, name:"Emilia Bahamondi", email:"bahamondi.emilia@cesd.edu.ar", flags:{glasses:true,disability:false,misbehave:false}, prefs:{pair:1,near:29,dislike:16} },
    { id:6, name:"Tomás Beltramino", email:"beltramino.tomas@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:24,near:21,dislike:20} },
    { id:7, name:"Facundo Bustos", email:"bustos.facundo@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:17,near:9,dislike:15} },
    { id:8, name:"Felipe Candellero", email:"candellero.felipe@cesd.edu.ar", flags:{glasses:true,disability:false,misbehave:false}, prefs:{pair:13,near:15,dislike:17} },
    { id:9, name:"Luca Carlesso", email:"carlesso.gian@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:17,near:7,dislike:4} },
    { id:10, name:"Joaquín Carretero", email:"carretero.joaquin@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:32,near:15,dislike:23} },
    { id:11, name:"Maité Cufré", email:"cufre.maite@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:21,near:24,dislike:0} },
    { id:12, name:"Emanuel Del Punta", email:"delpunta.emanuel@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:24,near:0,dislike:9} },
    { id:13, name:"David Di Francesca", email:"difrancesca.david@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:19,near:33,dislike:0} },
    { id:14, name:"Lourdes Fernandez", email:"lourdes.fernandez@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:23,near:11,dislike:5} },
    { id:15, name:"Benjamín García", email:"bgarcia886@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:10,near:32,dislike:20} },
    { id:16, name:"Enzo Gritti", email:"gritti.enzo@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:5,near:11,dislike:0} },
    { id:17, name:"Thiago Gutierrez", email:"gutierrez.thiago@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:7,near:9,dislike:0} },
    { id:18, name:"Juliana Herrmann", email:"herrman.juliana@cesd.edu.ar", flags:{glasses:false,disability:true,misbehave:false}, prefs:{pair:36,near:6,dislike:4} },
    { id:19, name:"Corbin Huang", email:"chuang034@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:23,near:33,dislike:7} },
    { id:20, name:"Lautaro Kistner", email:"lkistner224@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:12,near:27,dislike:9} },
    { id:21, name:"Ibi Lighezzolo", email:"lighezzolo.ibi@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:11,near:14,dislike:0} },
    { id:22, name:"Lorenzo López", email:"lopez.lorenzo@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:4,near:12,dislike:28} },
    { id:23, name:"Julián Lucero", email:"jlucero213@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:14,near:0,dislike:10} },
    { id:24, name:"Alejandro Malqui", email:"malqui.alejandro@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:12,near:31,dislike:20} },
    { id:25, name:"Valentina Maragliano", email:"maragliano.valentina@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:34,near:35,dislike:36} },
    { id:26, name:"Francesca Martínez", email:"martinez.francesca@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:16,near:11,dislike:0} },
    { id:27, name:"Julián Oga", email:"oga.julian@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:35,near:12,dislike:36} },
    { id:28, name:"Marina Orlando", email:"orlando.marina@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:2,near:30,dislike:36} },
    { id:29, name:"Enzo Ovejero", email:"ovejero.enzo@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:15,near:32,dislike:0} },
    { id:30, name:"Ema Qüerio", email:"querio.ema@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:28,near:2,dislike:0} },
    { id:31, name:"Thiago Quinteros", email:"quinteros.thiago@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:24,near:6,dislike:4} },
    { id:32, name:"Andrés Rigoni", email:"rigoni.andres@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:10,near:29,dislike:19} },
    { id:33, name:"Pedro Rivarola", email:"rivarola.pedro@cesd.edu.ar", flags:{glasses:true,disability:false,misbehave:false}, prefs:{pair:19,near:29,dislike:0} },
    { id:34, name:"Matías Silvestro", email:"msilvestro@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:25,near:27,dislike:11} },
    { id:35, name:"Mora Suárez", email:"suarez.mora@cesd.edu.ar", flags:{glasses:false,disability:false,misbehave:false}, prefs:{pair:27,near:25,dislike:0} },
    { id:36, name:"Ainara Villaroel", email:"villarroel.ainara@cesd.edu.ar", flags:{glasses:false,disability:true,misbehave:false}, prefs:{pair:18,near:6,dislike:0} },
  ];

  let students = JSON.parse(JSON.stringify(DEFAULT_STUDENTS_3A));


  // ---------- HELPERS GLOBALES (moved out so you can call them from console) ----------
  function normalize(str){
    if(!str && str !== 0) return "";
    return String(str)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/,/g, " ") // "Carretero, Joaquin" -> "carretero joaquin"
      .trim()
      .replace(/\s+/g, " ");
  }

  // mapa nombre -> correo (pegá o ajustá si cambian emails)
  function getEmailMap(studentList = students){
    const map = {};
    studentList.forEach(s => {
      if(s.email){
        map[s.email.toLowerCase()] = s.id;
      }
    });
    return map;
  }

  function findStudentIdByEmail(email, studentList = students){
    if(!email) return 0;

    const map = getEmailMap(studentList);
    const e = email.toLowerCase().trim();

    if(map[e]) return map[e];

    const local = e.split("@")[0];
    for(const key in map){
      if(key.split("@")[0] === local){
        return map[key];
      }
    }

    return 0;
  }

  function findStudentIdByName(name, studentList = students){
    if(!name) return 0;

    const n = normalize(name);
    let best = studentList.find(st => normalize(st.name) === n);
    if(best) return best.id;

    best = studentList.find(st => normalize(st.name).includes(n) || n.includes(normalize(st.name)));
    if(best) return best.id;

    const candidate = studentList.find(st => {
      const apellido = normalize(st.name).split(" ").pop();
      return n.includes(apellido) || apellido.includes(n);
    });

    return candidate ? candidate.id : 0;
  }


  // ---------- UTIL: apellido (última palabra del name) ----------
  function surname(fullName){
    const parts = fullName.trim().split(/\s+/);
    if(parts.length <= 1) return fullName;
    return parts.slice(1).join(" ");
  }

  // ---------- UI elements ----------
  const seatsGrid = document.getElementById('seatsGrid');
  let currentAssignment = null;
  let selectedStudentId = null;
  const details = document.getElementById('details');
  const btnGenerate = document.getElementById('btnGenerate');
  const btnRandomSeed = document.getElementById('btnRandomSeed');
  const btnSaveLS = document.getElementById('btnSaveLS');
  const btnLoadLS = document.getElementById('btnLoadLS');
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnPreferences = document.getElementById('btnPreferences');

  const cfgPrecision = document.getElementById('cfgPrecision');
  const cfgTheme = document.getElementById('cfgTheme');
  const cfgAutoSave = document.getElementById('cfgAutoSave');

  const prefsModal = document.getElementById('prefsModal');
  const prefsList = document.getElementById('prefsList');
  const closePrefs = document.getElementById('closePrefs');
  const savePrefs = document.getElementById('savePrefs');
  const cancelPrefs = document.getElementById('cancelPrefs');

  // ---------- Persistencia (cargar/guardar) ----------
  function saveAllToLocalStorage(){
    saveCurrentDivision();
    persistSchool();
  }
  function loadAllFromLocalStorage(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;

    try {
      const payload = JSON.parse(raw);

      if(payload.school && typeof payload.school === "object"){
        school = payload.school;
      }

      if(typeof payload.seed === "number"){
        rngSeed = payload.seed;
      }

      return true;
    } catch(e){
      console.error("load error", e);
      return false;
    }
  }

  // Attempt to load on start
  loadAllFromLocalStorage();

  // ---------- render students panel (left): show flags + editable name (but keep name full) ----------




  // ---------- preferences modal rendering ----------
  function renderPrefsModal(){
    prefsList.innerHTML = '';

    // ordenar por apellido
    students.sort((a,b)=>{
      return getSurname(a.name).localeCompare(getSurname(b.name));
    });

    // re-asignar IDs

    // opciones para los selects
    const options = [
      { id: 0, label: '— Ninguno —' },
      ...students.map(s => ({
        id: s.id,
        label: `${s.id}. ${s.name}`
      }))
    ];

    students.forEach(s => {
      const row = document.createElement('div');
      row.className = 'prefs-row';

      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = `${students.indexOf(s)+1}. ${s.name}`;

      const selLike1 = document.createElement('select');
      selLike1.dataset.target = 'like1';
      selLike1.dataset.id = s.id;

      const selLike2 = document.createElement('select');
      selLike2.dataset.target = 'like2';
      selLike2.dataset.id = s.id;

      const selDis = document.createElement('select');
      selDis.dataset.target = 'dislike';
      selDis.dataset.id = s.id;

      options.forEach(opt => {
        const o1 = document.createElement('option');
        o1.value = opt.id;
        o1.textContent = opt.label;
        selLike1.appendChild(o1);

        const o2 = document.createElement('option');
        o2.value = opt.id;
        o2.textContent = opt.label;
        selLike2.appendChild(o2);

        const o3 = document.createElement('option');
        o3.value = opt.id;
        o3.textContent = opt.label;
        selDis.appendChild(o3);
      });

      selLike1.value = s.prefs.pair || 0;
      selLike2.value = s.prefs.near || 0;
      selDis.value = s.prefs.dislike || 0;

      function wrapSelect(title, select){
        const box = document.createElement('div');
        box.style.display = 'flex';
        box.style.flexDirection = 'column';
        box.style.fontSize = '12px';
        box.style.gap = '2px';

        const t = document.createElement('span');
        t.textContent = title;

        box.appendChild(t);
        box.appendChild(select);
        return box;
      }

      row.appendChild(label);
      row.appendChild(wrapSelect('👍 Quiere compartir banco con', selLike1));
      row.appendChild(wrapSelect('👍 Quiere tener cerca', selLike2));
      row.appendChild(wrapSelect('👎 Prefiere no estar cerca de', selDis));

      prefsList.appendChild(row);
    });
  }

  // open/close modal
  function openPrefsModal(){ renderPrefsModal(); prefsModal.classList.remove('hidden'); prefsModal.setAttribute('aria-hidden','false'); }
  function closePrefsModal(){ prefsModal.classList.add('hidden'); prefsModal.setAttribute('aria-hidden','true'); }

  // save preferences from modal to students array and localStorage
  function savePreferencesFromModal(){
    const selects = prefsList.querySelectorAll('select');
    selects.forEach(sel => {
      const id = parseInt(sel.dataset.id);
      const s = students.find(x=>x.id===id);
      if(!s) return;
      const target = sel.dataset.target;
      const val = parseInt(sel.value) || 0;
      if(target === 'like1') s.prefs.pair = val;
      if(target === 'like2') s.prefs.near = val;
      if(target === 'dislike') s.prefs.dislike = val;
    });
    saveAllToLocalStorage();
    closePrefsModal();
    alert('Preferencias guardadas.');
  }

  // ---------- draw seat grid (surname only) ----------
  function renderSeatGrid(assignments = null, conflicts = [], heatmap = null) {
    updateGridTemplate()
    seatsGrid.innerHTML = '';
    seatMap.forEach(seat => {
      const el = document.createElement('div');
      el.className = 'seat';
      el.style.gridColumn = seat.gridCol;
      el.style.gridRow = seat.gridRow;
      const assign = assignments ? assignments.find(a=>a.seatId===seat.id) : null;
      if(!assign){
        el.classList.add('empty');
        el.textContent = `Libre`;
      } else {
          const stu = students.find(s => s.id === assign.studentId);

          if(!stu){
            el.classList.add("conflict");
            el.innerHTML = `<div class="meta">${assign.studentId}</div><div>Alumno faltante</div>`;
            seatsGrid.appendChild(el);
            return;
          }

          if(assign.studentId === selectedStudentId){
            el.style.background = "#bde7ff";
          }

          const apellido = surname(stu.name);
        el.innerHTML = `<div class="meta">${assign.studentId}</div><div>${apellido}</div>`;
        const meta = [];
        if(stu.flags.glasses) meta.push('👓');
        if(stu.flags.disability) meta.push('1️⃣');
        if(stu.flags.misbehave) meta.push('⚠️');
        if(meta.length) el.innerHTML += `<div style="margin-top:6px">${meta.join(' ')}</div>`;
        if(conflicts.includes(assign.studentId)) el.classList.add('conflict');

      }
          // click para intercambiar
      if(assignments){
        el.addEventListener('click', () => handleSeatClick(assign.studentId));
      }

      seatsGrid.appendChild(el);
    });


  }

  // ---------- GENERADOR & SCORING (igual que antes) ----------
  const WEIGHTS = {

    pairAdjacent: 80,   // compartir banco
    pairNear: 35,

    near: 40,           // ahora casi tan importante como pairNear

    dislikeNear: -100,

    glassesBadRow: -150,
    disabilityBad: -200,
    misbehaveFrontBonus: 4,

  };

  function ignorePreferences(){
    return config.precision === 1;
  }

  function scoreAssignment(assignments){
    let score = 0;
    const conflicts = new Set();
    const seatById = Object.fromEntries(seatMap.map(s=>[s.id,s]));
    const assignByStudent = Object.fromEntries(assignments.map(a=>[a.studentId,a]));
    students.forEach(s => {
      const a = assignByStudent[s.id];
      if(!a) return;
      const seat = seatById[a.seatId];
      if(s.flags.disability){
        if(seat.gridRow !== 1){ score += WEIGHTS.disabilityBad; conflicts.add(s.id); }
        else score += Math.abs(WEIGHTS.disabilityBad);
      }
      if(s.flags.glasses && seat.gridRow >=4){
        score += WEIGHTS.glassesBadRow; conflicts.add(s.id);
      }
      if(s.flags.misbehave){
        if(seat.gridRow <= 3) score += WEIGHTS.misbehaveFrontBonus;
      }
      // compañero de banco (prioridad máxima)
      if(!ignorePreferences() && s.prefs.pair){
        const other = assignByStudent[s.prefs.pair];
        if(other){
          const otherSeat = seatById[other.seatId];

          if(sameDesk(seat, otherSeat)){
            score += WEIGHTS.pairAdjacent;   // compartir banco real
          }
          else{
            const dist = manhattan(seat, otherSeat);
            if(dist <= 2){
              score += WEIGHTS.pairNear;     // cerca pero no mismo banco
            }
          }
        }
      }

      // regla indisciplina: no cerca de amigos
      if(s.flags.misbehave){

        const friendIds = ignorePreferences() ? [] : [s.prefs.pair, s.prefs.near];

        friendIds.forEach(fid=>{
          if(!fid) return;

          const other = assignByStudent[fid];
          if(!other) return;

          const dist = manhattan(seat, seatById[other.seatId]);

          if(dist <= 1){
            score -= 120; // penalización fuerte
            conflicts.add(s.id);
            conflicts.add(fid);
          }
        });

      }

      // cerca
      if(!ignorePreferences() && s.prefs.near){
        const other = assignByStudent[s.prefs.near];
        if(other){
          const dist = manhattan(seat, seatById[other.seatId]);

          if(dist <= 2) score += WEIGHTS.near;
        }
      }
      const d = s.prefs.dislike;
      if(d && d !== 0){
        const other = assignByStudent[d];
        if(other){
          const dist = manhattan(seat, seatById[other.seatId]);
          if(dist <= 2){
            score += WEIGHTS.dislikeNear;
            conflicts.add(s.id);
            conflicts.add(d);
          }
        }
      }
    });
    return { score, conflicts: Array.from(conflicts) };
  }


  function generateInitialAssignment(){
    if(seatMap.length < students.length){
      alert("No hay suficientes bancos para todos los alumnos.");
      return [];
    }
    rngSeed = Math.floor(Math.random()*1e9);
    const freeSeats = seatMap.map(s=>({ ...s }));
    const assignment = [];
    const row1Seats = freeSeats.filter(s=>s.gridRow===1).slice();
    const disabilityStudents = students.filter(s=>s.flags.disability);
    disabilityStudents.forEach(s => {
      if(row1Seats.length){
        const idx = Math.floor(rand()*row1Seats.length);
        const seat = row1Seats.splice(idx,1)[0];
        const i = freeSeats.findIndex(x=>x.id===seat.id); if(i>=0) freeSeats.splice(i,1);
        assignment.push({ studentId:s.id, seatId:seat.id });
      } else {
        const idx = Math.floor(rand()*freeSeats.length);
        const seat = freeSeats.splice(idx,1)[0];
        assignment.push({ studentId:s.id, seatId:seat.id });
      }
    });

    const glassStudents = students.filter(s=>s.flags.glasses && !s.flags.disability);
    glassStudents.forEach(s => {
      const allowed = freeSeats.filter(se => se.gridRow <= 3);
      if(allowed.length){
        const seat = allowed.splice(Math.floor(rand()*allowed.length),1)[0];
        const i = freeSeats.findIndex(x=>x.id===seat.id); if(i>=0) freeSeats.splice(i,1);
        assignment.push({ studentId:s.id, seatId:seat.id });
      } else {
        const seat = freeSeats.splice(Math.floor(rand()*freeSeats.length),1)[0];
        assignment.push({ studentId:s.id, seatId:seat.id });
      }
    });

    const placedIds = new Set(assignment.map(a=>a.studentId));
    const remaining = students.filter(s=>!placedIds.has(s.id));
    for(let i=remaining.length-1;i>0;i--){ const j = Math.floor(rand()*(i+1)); [remaining[i],remaining[j]]=[remaining[j],remaining[i]]; }
    remaining.forEach(s => {
      const seat = freeSeats.splice(Math.floor(rand()*freeSeats.length),1)[0];
      assignment.push({ studentId:s.id, seatId:seat.id });
    });

    return assignment;
  }

  function optimize(assignment, iterations=2500){
    let best = assignment.slice();
    let bestScore = scoreAssignment(best).score;
    for(let k=0;k<iterations;k++){
      const a = Math.floor(rand()*best.length);
      const b = Math.floor(rand()*best.length);
      if(a===b) continue;
      const cand = best.map(x=>({...x}));
      // impedir mover discapacitados fuera de fila 1
      const studentA = students.find(s=>s.id===cand[a].studentId);
      const studentB = students.find(s=>s.id===cand[b].studentId);

      const seatA = seatMap.find(s=>s.id===cand[a].seatId);
      const seatB = seatMap.find(s=>s.id===cand[b].seatId);

      if(studentA.flags.disability && seatB.gridRow !== 1) continue;
      if(studentB.flags.disability && seatA.gridRow !== 1) continue;
      // impedir lentes en últimas filas
      if(studentA.flags.glasses && seatB.gridRow >= 4) continue;
      if(studentB.flags.glasses && seatA.gridRow >= 4) continue;
      const t = cand[a].studentId; cand[a].studentId = cand[b].studentId; cand[b].studentId = t;
      const sc = scoreAssignment(cand).score;
      if(sc > bestScore){
        best = cand; bestScore = sc;
      } else {
        if(rand() < 0.002){ best = cand; bestScore = sc; }
      }
    }
    return best;
  }

  function generateFull(){
    rngSeed = Math.floor(Math.random()*1e9);
    const initial = generateInitialAssignment();
    const iterations = config.precision * 1000;
    const improved = optimize(initial, iterations);
    const {score, conflicts} = scoreAssignment(improved);
    return { assignment: improved, score, conflicts };
  }

  function exportPDF(assign, studentList){

    const rows = bankLayout.length + 1; // + pizarrón
    const cols = bankLayout[0].length;

    const grid = Array.from({length:rows}, ()=>Array(cols).fill(""));

    grid[0][0] = "PIZARRÓN";

    const seatById = Object.fromEntries(seatMap.map(s=>[s.id,s]));

    assign.forEach(a=>{
      const seat = seatById[a.seatId];
      const student = studentList.find(s=>s.id===a.studentId);

      const r = seat.gridRow;
      const c = seat.gridCol - 1;

      grid[r][c] = student ? student.name : "";
    });

    let html = `
      <html>
      <head>
        <style>
          body{font-family:Arial;text-align:center}
          table{border-collapse:collapse;margin:auto}
          td{
            border:2px solid black;
            width:100px;
            height:50px;
            text-align:center;
            vertical-align:middle;
          }
          .board{
            background:black;
            color:white;
            font-weight:bold;
            font-size:18px;
          }
          .seat{
            background:#BDD7EE;
          }
        </style>
      </head>
      <body>
        <h2>Mapa Áulico</h2>
        <table>
    `;

    for(let r=0; r<rows; r++){
      html += "<tr>";

      for(let c=0; c<cols; c++){

        const isSeat = seatMap.some(s => s.gridRow === r && s.gridCol-1 === c);

        if(r === 0){
          html += `<td class="board" colspan="${cols}">PIZARRÓN</td>`;
          break;
        }

        html += `<td class="${isSeat ? "seat" : ""}">${grid[r][c] || ""}</td>`;
      }

      html += "</tr>";
    }

    html += `
        </table>
      </body>
      </html>
    `;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  }

  // ---------- Export CSV ----------
  function exportCSV(assign){

    const rows = 7;
    const cols = 8;

    const grid = Array.from({length:rows}, ()=>Array(cols).fill(""));

    grid[0][0] = "PIZARRÓN";

    const seatById = Object.fromEntries(seatMap.map(s=>[s.id,s]));

    assign.forEach(a=>{

      const seat = seatById[a.seatId];
      const student = students.find(s=>s.id===a.studentId);

      const r = seat.gridRow;
      const c = seat.gridCol-1;

      grid[r][c] = student.name;

    });

    const ws = XLSX.utils.aoa_to_sheet(grid);

    ws["!rows"] = [
      {hpx:70},
      {hpx:45},
      {hpx:45},
      {hpx:45},
      {hpx:45},
      {hpx:45},
      {hpx:45}
    ];

    ws["!cols"] = Array(cols).fill({wch:18});

    ws["!merges"] = [{
      s:{r:0,c:0},
      e:{r:0,c:7}
    }];

    const range = XLSX.utils.decode_range(ws['!ref']);

    const seatCells = new Set();

    seatMap.forEach(s=>{
      seatCells.add(`${s.gridRow}_${s.gridCol-1}`);
    });

    for(let R = range.s.r; R <= range.e.r; ++R){
      for(let C = range.s.c; C <= range.e.c; ++C){

        const addr = XLSX.utils.encode_cell({r:R,c:C});

        if(!ws[addr]) ws[addr] = {t:"s",v:""};

        if(R === 0){

          ws[addr].s = {
            alignment:{horizontal:"center",vertical:"center",wrapText:true},
            font:{bold:true,color:{rgb:"FFFFFF"},sz:18},
            fill:{fgColor:{rgb:"000000"}}
          };

        }else{

          ws[addr].s = {
            alignment:{horizontal:"center",vertical:"center",wrapText:true},
            font:{sz:11}
          };

          if(seatCells.has(`${R}_${C}`)){

            ws[addr].s.border = {
              top:{style:"thick",color:{rgb:"000000"}},
              bottom:{style:"thick",color:{rgb:"000000"}},
              left:{style:"thick",color:{rgb:"000000"}},
              right:{style:"thick",color:{rgb:"000000"}}
            };

            ws[addr].s.fill = {
              fgColor:{rgb:"BDD7EE"}
            };

          }

        }

      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mapa Áulico");

    XLSX.writeFile(wb, "mapa_aulico.xlsx", { cellStyles: true });

  }

  function handleSeatClick(studentId){

    if(!currentAssignment) return;

    // primer click
    if(selectedStudentId === null){
      selectedStudentId = studentId;
      renderSeatGrid(currentAssignment);
      return;
    }

    // segundo click
    if(selectedStudentId === studentId){
      selectedStudentId = null;
      renderSeatGrid(currentAssignment);
      return;
    }

    // intercambiar asientos
    const a = currentAssignment.find(x=>x.studentId===selectedStudentId);
    const b = currentAssignment.find(x=>x.studentId===studentId);

    const temp = a.seatId;
    a.seatId = b.seatId;
    b.seatId = temp;

    selectedStudentId = null;

    const {conflicts} = scoreAssignment(currentAssignment);
    renderSeatGrid(currentAssignment, conflicts);
  }

  // ---------- UI events ----------
  btnGenerate.addEventListener('click', ()=> {
    const { assignment, score, conflicts } = generateFull();

    currentAssignment = assignment;

    renderSeatGrid(currentAssignment, conflicts);
    details.innerHTML = `<strong>Score:</strong> ${score} <br> <strong>Conflictos marcados:</strong> ${conflicts.length ? conflicts.join(', ') : 'Ninguno'}`;
    if(currentYear && currentDivision){
      ensureDivision(currentYear, currentDivision).saved = false;
      saveCurrentDivision();
      persistSchool();
      renderYears();
    }
  });
  btnRandomSeed.addEventListener('click', ()=> {
    rngSeed = Math.floor(Math.random()*1e9);
    alert('Nueva semilla asignada.');
  });
  btnSaveLS.addEventListener('click', ()=> {
    saveAllToLocalStorage();
    alert('Guardado en localStorage.');
  });
  btnLoadLS.addEventListener('click', ()=> {
    const ok = loadAllFromLocalStorage();
    if(ok){  alert('Cargado desde localStorage.'); }
    else alert('No hay datos guardados.');
  });
  btnExportCSV.addEventListener('click', ()=> {

    if(!currentAssignment){
      alert("Primero generá un mapa áulico.");
      return;
    }

    openExportModal(currentAssignment, students);

  });

    // URL que obtuviste al desplegar Apps Script
  const GOOGLE_FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbw376dv6GjdsSJ_vajBWZDBA2wzOR_k2eR6IKcfbI3by9TnD4xjp2djjupED9z2gwX2/exec';

  // --- función que importa y aplica preferencias desde Google Forms ---
  async function importPrefsFromGoogleForms() {
    try {
      const res = await fetch(GOOGLE_FORM_ENDPOINT);
      if (!res.ok) throw new Error('fetch error ' + res.status);
      const payload = await res.json();
      if(!payload || !payload.data) throw new Error('Formato inesperado del JSON');

      // payload.data es array de filas con claves == cabeceras del sheet
      // Necesitás que las cabeceras del sheet sean algo claro, por ejemplo:
      // "ID alumno", "Nombre", "Compartir banco con (pair)", "Tener cerca (near)", "Prefiere no estar cerca de (dislike)",
      // "Lentes", "Primera fila", "Indisciplina"
      const rows = payload.data;
      console.log("DATOS CRUDOS DEL FORM:", rows);

      // Mapear por cada fila:
      function applyRowsToStudentList(studentList, rows){
        let changed = false;

        rows.forEach(row => {
          let id = 0;

          const emailField =
            row['Dirección de correo electrónico'] ||
            row['Correo electrónico'] ||
            row['Email'] ||
            row['email'] ||
            row['Email address'] ||
            row['E-mail'];

          if(emailField){
            id = findStudentIdByEmail(emailField, studentList);
          }

          if(!id){
            const idRaw = row['ID alumno'] || row['ID'] || row['id'] || row['id alumno'];
            id = parseInt(String(idRaw || '').replace(/\D/g, '')) || 0;
          }

          if(!id){
            const nameField = row['Nombre'] || row['Nombre completo'] || row['Full name'] || row['Name'] || row['¿Cómo te llamás?'];
            if(nameField){
              id = findStudentIdByName(nameField, studentList);
            }
          }

          if(!id) return;

          const s = studentList.find(x => x.id === id);
          if(!s) return;

          const pairRaw =
            row['Compartir banco con (pair)'] ||
            row['Compartir banco con'] ||
            row['¿Con quién querés compartir banco (sentarse al lado)?'] ||
            row['pair'] ||
            row['Pair'];

          const nearRaw =
            row['Tener cerca (near)'] ||
            row['Tener cerca'] ||
            row['¿A quién querés cerca?'] ||
            row['near'] ||
            row['Near'];

          const dislikeRaw =
            row['Prefiere no estar cerca de (dislike)'] ||
            row['Prefiere no estar cerca de'] ||
            row['¿Con quién preferís no estar cerca?'] ||
            row['dislike'] ||
            row['Dislike'];

          s.prefs.pair = findStudentIdByName(pairRaw, studentList);
          s.prefs.near = findStudentIdByName(nearRaw, studentList);
          s.prefs.dislike = findStudentIdByName(dislikeRaw, studentList);

          const glassesRaw = row['Lentes'] || row['Lentes?'] || row['Glasses'];
          const firstRowRaw = row['Primera fila'] || row['Primera fila?'] || row['First row'];
          const indisciplineRaw = row['Indisciplina'] || row['Indisciplinado'] || row['Indiscipline'];

          const truthy = v => {
            if(v === undefined || v === null) return false;
            v = String(v).toLowerCase();
            return v === 'true' || v === 'si' || v === 'sí' || v === 'yes' || v === 'y';
          };

          s.flags.glasses = truthy(glassesRaw);
          s.flags.disability = truthy(firstRowRaw);
          s.flags.misbehave = truthy(indisciplineRaw);

          changed = true;
        });

        return changed;
      }
      let anyChange = false;

      for(const [year, yearData] of Object.entries(school)){
        for(const [divisionName, divisionData] of Object.entries(yearData.divisions || {})){
          const changed = applyRowsToStudentList(divisionData.students || [], rows);
          if(changed){
            divisionData.saved = false;
            anyChange = true;
          }
        }
      }

      if(currentYear && currentDivision){
        const data = ensureDivision(currentYear, currentDivision);
        students = clone(data.students);
        currentAssignment = data.assignment ? clone(data.assignment) : null;
        bankLayout = clone(data.bankLayout);
        rebuildSeatMap();
        renderSeatGrid(currentAssignment);
      }

      persistSchool();
      renderYears();

      // actualizar UI + persistir
      renderPrefsModal(); // 👈 ESTA LÍNEA ES LA CLAVE
      saveAllToLocalStorage();

      console.log("IMPORTACIÓN COMPLETA. ESTADO FINAL:", students);

      alert('Preferencias importadas desde Google Forms y aplicadas.');
    } catch (err) {
      console.error('Import error', err);
      alert('Error importando: ' + err.message);
    }
  }

  // -- opcional: botón para disparar la importación
  const btnImportForm = document.getElementById('btnImportForm');
  if(btnImportForm){
    btnImportForm.addEventListener('click', ()=> {
      if(!confirm('Importar preferencias desde Google Forms sobrescribirá las preferencias actuales. Continuar?')) return;
      importPrefsFromGoogleForms();
    });
  }

  // preferences modal events
  btnPreferences.addEventListener('click', openPrefsModal);
  closePrefs.addEventListener('click', closePrefsModal);
  cancelPrefs.addEventListener('click', closePrefsModal);
  savePrefs.addEventListener('click', savePreferencesFromModal);

  // initial render
  renderSeatGrid();

  function saveConfig(){
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  function loadConfig(){

    const raw = localStorage.getItem(CONFIG_KEY);
    if(!raw) return;

    try{
      const data = JSON.parse(raw);
      config = {...config, ...data};
    }catch(e){}
  }

  function applyConfig(){

    cfgPrecision.value = config.precision;
    cfgTheme.value = config.theme;

    if(config.theme === "dark"){
      document.body.classList.add("dark");
    }else{
      document.body.classList.remove("dark");
    }

  }

  cfgPrecision.addEventListener("change", ()=>{
    config.precision = parseInt(cfgPrecision.value) || 50;
    saveConfig();
  });

  cfgTheme.addEventListener("change", ()=>{
    config.theme = cfgTheme.value;

    if(config.theme === "dark"){
      document.body.classList.add("dark");
    }else{
      document.body.classList.remove("dark");
    }

    saveConfig();
  });

  loadConfig();
  applyConfig();
  renderYears();
  renderLegend();

})();