// --- GAME DATA & CONFIG ---
let money = 1500;
let activeWeather = "Ensolarado"; // Ensolarado, Chuvoso, Seca, Geada
let weatherImpact = { growth: 1, waterBurn: 1 };

const cropsConfig = {
    soja: { name: "Soja Transgênica", icon: "🌱", cost: 100, sell: 250, time: 10, waterNeed: 0.5 },
    milho: { name: "Milho Bio-Tech", icon: "🌽", cost: 250, sell: 600, time: 18, waterNeed: 0.8 },
    trigo: { name: "Trigo Hidropônico", icon: "🌾", cost: 500, sell: 1300, time: 28, waterNeed: 0.4 },
    cafe: { name: "Café Gourmet Agro", icon: "☕", cost: 1000, sell: 3000, time: 45, waterNeed: 1.2 }
};

const techUpgrades = {
    sensorIot: { id: "sensorIot", name: "Sensores IoT de Solo", desc: "Mostra dados exatos de umidade e otimiza consumo de água.", cost: 400, bought: false },
    droneIrrigacao: { id: "droneIrrigacao", name: "Drones de Irrigação IA", desc: "Regam os lotes automaticamente se a umidade cair de 35%.", cost: 1200, bought: false },
    harvestBot: { id: "harvestBot", name: "Colheitadeiras Autônomas", desc: "Detectam o ponto ideal do fruto e colhem de forma 100% autônoma.", cost: 2500, bought: false },
    weatherShield: { id: "weatherShield", name: "Climatizador de Escudo Estufa", desc: "Anula os efeitos severos de Seca e Geada na fazenda.", cost: 5000, bought: false }
};

// 9 plots structure
let plots = Array.from({ length: 9 }, (_, i) => ({
    id: i,
    crop: null,       // key de cropsConfig ou null
    progress: 0,      // 0 a 100
    water: 100,       // 0 a 100
    status: "Vazio"   // Vazio, Crescendo, Pronto, Seco
}));

let selectedSeed = "soja";

// --- CORE LOOPS ---
// Principal update a cada 1 segundo (Tick do jogo)
setInterval(() => {
    processWeatherEffects();
    processPlotsGrowth();
    updateUI();
}, 1000);

// Loop de clima a cada 20 segundos
setInterval(() => {
    changeWeather();
}, 20000);

// Inicializar o jogo assim que carregar o script
initGame();

// --- FUNCTIONS ---

function initGame() {
    renderSeedMarket();
    renderTechHub();
    renderGrid();
    updateUI();
}

function renderSeedMarket() {
    const container = document.getElementById("seed-market");
    container.innerHTML = "";
    Object.keys(cropsConfig).forEach(key => {
        const crop = cropsConfig[key];
        container.innerHTML += `
            <div class="shop-item" style="cursor:pointer; border-radius:6px; padding:5px;" onclick="selectSeed('${key}')" id="seed-card-${key}">
                <div class="item-details">
                    <p>${crop.icon} <strong>${crop.name}</strong></p>
                    <span>Custo: R$${crop.cost} | Retorno: R$${crop.sell}</span>
                </div>
                <span style="font-size:0.8rem; font-weight:bold; color:var(--accent-green)">Selecionar</span>
            </div>
        `;
    });
    selectSeed("soja");
}

function selectSeed(key) {
    selectedSeed = key;
    Object.keys(cropsConfig).forEach(k => {
        const card = document.getElementById(`seed-card-${k}`);
        if (card) card.style.background = (k === key) ? "#334155" : "transparent";
    });
}

function renderTechHub() {
    const container = document.getElementById("tech-hub");
    container.innerHTML = "";
    Object.keys(techUpgrades).forEach(key => {
        const tech = techUpgrades[key];
        container.innerHTML += `
            <div class="tech-item">
                <div class="item-details" style="max-width: 70%;">
                    <p><strong>${tech.name}</strong></p>
                    <span style="display:block; line-height:1.2; margin-top:2px;">${tech.desc}</span>
                </div>
                <button class="btn ${tech.bought ? 'btn-blue' : 'btn-green'}" id="btn-tech-${key}" onclick="buyTech('${key}')">
                    ${tech.bought ? 'Ativo' : 'R$ ' + tech.cost}
                </button>
            </div>
        `;
    });
}

function renderGrid() {
    const grid = document.getElementById("farm-grid");
    grid.innerHTML = "";
    plots.forEach(plot => {
        grid.innerHTML += `
            <div class="plot" id="plot-${plot.id}">
                <div class="plot-info">
                    <span style="float:right; font-weight:bold; color:#94a3b8;">#${plot.id + 1}</span>
                    <span id="plot-status-text-${plot.id}">Lote Vazio</span>
                </div>
                <div class="plot-crop" id="plot-icon-${plot.id}">🟫</div>
                <div>
                    <div class="progress-bar"><div class="progress-fill" id="plot-progress-${plot.id}"></div></div>
                    <div class="water-bar" id="water-bar-container-${plot.id}" style="visibility:hidden;"><div class="water-fill" id="plot-water-${plot.id}"></div></div>
                </div>
                <div class="plot-actions">
                    <button class="btn btn-green" id="btn-action-${plot.id}" onclick="plant(${plot.id})">Plantar</button>
                    <button class="btn btn-blue" onclick="waterManual(${plot.id})">Regar</button>
                </div>
            </div>
        `;
    });
}

function updateUI() {
    document.getElementById("money-display").innerText = `R$ ${money.toLocaleString('pt-BR')}`;
    document.getElementById("weather-display").innerText = getWeatherEmoji() + " " + activeWeather;
    
    // Calc Tech efficiency
    let boughtCount = Object.values(techUpgrades).filter(t => t.bought).length;
    let efficiency = Math.round((boughtCount / Object.keys(techUpgrades).length) * 100);
    document.getElementById("tech-display").innerText = `${efficiency}%`;

    // Dynamic colors for weather
    let wColor = "#f59e0b";
    if(activeWeather === "Chuvoso") wColor = "#3b82f6";
    if(activeWeather === "Seca") wColor = "#ef4444";
    if(activeWeather === "Geada") wColor = "#60a5fa";
    document.getElementById("weather-display").style.color = wColor;

    // Update real-time plot bars and texts
    plots.forEach(plot => {
        const progressFill = document.getElementById(`plot-progress-${plot.id}`);
        const waterFill = document.getElementById(`plot-water-${plot.id}`);
        const statusText = document.getElementById(`plot-status-text-${plot.id}`);
        const actionBtn = document.getElementById(`btn-action-${plot.id}`);

        if(progressFill) progressFill.style.width = `${plot.progress}%`;
        if(waterFill) waterFill.style.width = `${plot.water}%`;
        
        if(statusText) {
            if(plot.crop === null) {
                statusText.innerText = "Lote Vazio";
                if(actionBtn) actionBtn.innerText = "Plantar";
            } else {
                statusText.innerText = `${plot.status} (${Math.round(plot.progress)}%)`;
                if(plot.status === "Pronto") {
                    if(actionBtn) actionBtn.innerText = "Colher";
                } else {
                    if(actionBtn) actionBtn.innerText = "Plantar";
                }
            }
        }
    });
}

function getWeatherEmoji() {
    if(activeWeather === "Ensolarado") return "☀️";
    if(activeWeather === "Chuvoso") return "🌧️";
    if(activeWeather === "Seca") return "🏜️";
    if(activeWeather === "Geada") return "❄️";
    return "☀️";
}

// --- GAMEPLAY MECHANICS ---

function plant(plotId) {
    let plot = plots[plotId];
    if (plot.crop !== null) {
        // Se já estiver pronto, colhe
        if(plot.status === "Pronto") {
            harvest(plotId);
        } else {
            addLog(`O Lote ${plotId+1} já está ocupado.`, "normal");
        }
        return;
    }

    let seedData = cropsConfig[selectedSeed];
    if (money < seedData.cost) {
        addLog("Capital insuficiente para comprar essa semente bio-tecnológica!", "weather-alert");
        return;
    }

    money -= seedData.cost;
    plot.crop = selectedSeed;
    plot.progress = 0;
    plot.water = 100;
    plot.status = "Crescendo";

    // Visual update imediato do lote
    document.getElementById(`plot-${plotId}`).classList.add("active");
    document.getElementById(`plot-icon-${plotId}`).innerText = seedData.icon;
    if(techUpgrades.sensorIot.bought) {
        document.getElementById(`water-bar-container-${plotId}`).style.visibility = "visible";
    }
    updateUI();
}

function waterManual(plotId) {
    let plot = plots[plotId];
    if(plot.crop === null) return;
    plot.water = Math.min(plot.water + 40, 100);
    if(plot.status === "Seco" && plot.water > 20) {
        plot.status = "Crescendo";
    }
    addLog(`Lote ${plotId+1} irrigado manualmente.`, "normal");
}

function harvest(plotId) {
    let plot = plots[plotId];
    if(plot.status !== "Pronto") return;

    let cropData = cropsConfig[plot.crop];
    let profit = cropData.sell;

    money += profit;
    addLog(`Colheita realizada no Lote ${plotId+1}! +R$${profit} injetados no capital.`, "normal");

    // Reset plot
    resetPlot(plotId);
    updateUI();
}

function resetPlot(plotId) {
    let plot = plots[plotId];
    plot.crop = null;
    plot.progress = 0;
    plot.water = 100;
    plot.status = "Vazio";

    document.getElementById(`plot-${plotId}`).classList.remove("active");
    document.getElementById(`plot-icon-${plotId}`).innerText = "🟫";
    document.getElementById(`plot-progress-${plotId}`).style.width = "0%";
    document.getElementById(`plot-status-text-${plotId}`).innerText = "Lote Vazio";
    document.getElementById(`water-bar-container-${plotId}`).style.visibility = "hidden";
}

function buyTech(techKey) {
    let tech = techUpgrades[techKey];
    if(tech.bought) return;

    if(money < tech.cost) {
        addLog("Falta de verba para pesquisa e desenvolvimento dessa tecnologia.", "weather-alert");
        return;
    }

    money -= tech.cost;
    tech.bought = true;
    
    addLog(`Tecnologia Desbloqueada: ${tech.name}!`, "normal");
    renderTechHub();
    
    if(techKey === "sensorIot") {
        // Habilita as barras de água visíveis de quem já tá plantado
        plots.forEach(p => {
            if(p.crop) document.getElementById(`water-bar-container-${p.id}`).style.visibility = "visible";
        });
    }

    updateUI();
}

// --- BACKGROUND SIMULATION ENGINE ---

function changeWeather() {
    const weathers = ["Ensolarado", "Ensolarado", "Chuvoso", "Seca", "Geada"];
    // Sorteia novo clima
    let newWeather = weathers[Math.floor(Math.random() * weathers.length)];
    activeWeather = newWeather;

    if(techUpgrades.weatherShield.bought) {
        addLog(`Mudança de clima para ${activeWeather}. Escudo de Estufa protege os cultivos ativos.`, "normal");
        weatherImpact.growth = 1;
        weatherImpact.waterBurn = activeWeather === "Chuvoso" ? 0 : 0.5; // Melhora uso da água
        updateUI();
        return;
    }

    if(activeWeather === "Ensolarado") {
        weatherImpact.growth = 1;
        weatherImpact.waterBurn = 1.2;
    } else if(activeWeather === "Chuvoso") {
        weatherImpact.growth = 1.5; // Cresce rápido na chuva
        weatherImpact.waterBurn = -2; // Regenera água
    } else if(activeWeather === "Seca") {
        weatherImpact.growth = 0.5; // Reduz crescimento
        weatherImpact.waterBurn = 2.5; // Seca água muito rápido
        addLog("⚠️ ALERTA DE SECA SEVERA! Ative irrigação ou proteja a fazenda.", "weather-alert");
    } else if(activeWeather === "Geada") {
        weatherImpact.growth = 0; // Para o crescimento
        weatherImpact.waterBurn = 0.5;
        addLog("⚠️ ALERTA DE GEADA! Cultivos não climatizados pararam de se desenvolver.", "weather-alert");
    }

    updateUI();
}

function processWeatherEffects() {
    plots.forEach(plot => {
        if(plot.crop === null) return;

        // Consumo / Ganho de água
        let cropData = cropsConfig[plot.crop];
        let dynamicBurn = cropData.waterNeed * weatherImpact.waterBurn;
        
        plot.water = Math.max(0, Math.min(100, plot.water - dynamicBurn));

        // Drone Autônomo atuando se comprado
        if(techUpgrades.droneIrrigacao.bought && plot.water < 35) {
            plot.water = Math.min(plot.water + 50, 100);
            addLog(`🤖 Drone IA detectou baixa umidade e irrigou o Lote ${plot.id+1}.`, "normal");
        }

        // Define status de secura
        if(plot.water <= 0) {
            plot.status = "Seco";
        }
    });
}

function processPlotsGrowth() {
    plots.forEach(plot => {
        if(plot.crop === null || plot.status === "Seco" || plot.status === "Pronto") return;

        let cropData = cropsConfig[plot.crop];
        
        // Calcula o incremento de progresso com base no tempo necessário e impacto do clima
        // Ex: Se leva 10s, cresce 10% por segundo (multiplicado pelo modificador climático)
        let growthIncrement = (100 / cropData.time) * weatherImpact.growth;
        plot.progress = Math.min(100, plot.progress + growthIncrement);

        if(plot.progress >= 100) {
            plot.status = "Pronto";
            addLog(`🌾 O Lote ${plot.id+1} (${cropData.name}) está pronto para a colheita!`, "normal");
            
            // Colheitadeira Autônoma atuando se comprada
            if(techUpgrades.harvestBot.bought) {
                harvest(plot.id);
            }
        }
    });
}

function addLog(text, type) {
    const container = document.getElementById("log-container");
    if(!container) return;
    
    const entry = document.createElement("div");
    entry.className = type === "weather-alert" ? "log-entry weather-alert" : "log-entry";
    entry.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
    
    container.appendChild(entry);
    container.scrollTop = container.scrollHeight; // Auto-scroll para o final
}