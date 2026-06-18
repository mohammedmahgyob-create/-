const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');

// ════════════ CONFIGURATION ════════════
const PREFIX = '!';
const BOT_OWNER = process.env.BOT_OWNER || '1515004170355212482';
const DB_FILE = './kingdom.json';

// TIMEOUTS & INTERVALS
const WORK_COOLDOWN = 12 * 60 * 60 * 1000;
const ATTACK_COOLDOWN = 3 * 60 * 60 * 1000;
const EXPLORE_COOLDOWN = 6 * 60 * 60 * 1000;
const RESEARCH_COOLDOWN = 24 * 60 * 60 * 1000;
const DAILY_BONUS_COOLDOWN = 24 * 60 * 60 * 1000;

// ════════════ DATABASE ════════════
const initDB = () => {
    try {
        if (!fs.existsSync(DB_FILE)) return createNewDB();
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('❌ خطأ DB:', err.message);
        return createNewDB();
    }
};

const createNewDB = () => ({
    cities: {},
    players: {},
    loans: [],
    joinRequests: {},
    loanRequests: {},
    alliances: [],
    marriages: [],
    leaderboard: {},
    achievements: {},
    events: [],
    artifacts: [],
    research: {}
});

let db = initDB();

const save = () => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (err) {
        console.error('❌ خطأ حفظ:', err.message);
    }
};

// ════════════ CLIENT ════════════
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ]
});

// ════════════ CONSTANTS ════════════
const RESOURCES = {
    gold: { name: '🥇 ذهب', buy: 1000, sell: 900, icon: '🥇' },
    iron: { name: '⛏️ حديد', buy: 400, sell: 350, icon: '⛏️' },
    stone: { name: '🪨 حجر', buy: 150, sell: 120, icon: '🪨' },
    wheat: { name: '🌾 قمح', buy: 100, sell: 80, icon: '🌾' },
    cattle: { name: '🐂 بقر', buy: 2500, sell: 2200, icon: '🐂' },
    goat: { name: '🐐 ماعز', buy: 900, sell: 750, icon: '🐐' },
    buffalo: { name: '🐃 جموس', buy: 3000, sell: 2700, icon: '🐃' }
};

const BUILDINGS = {
    mine: { name: '⛏️ منجم ذهب', cost: 60000, prod: { gold: 20 }, level: 1 },
    desert: { name: '🏜️ صحراء', cost: 35000, prod: { stone: 15, iron: 8 }, level: 1 },
    farm: { name: '🌾 مزرعة', cost: 25000, prod: { wheat: 50 }, level: 1 },
    ranch: { name: '🐄 حظيرة', cost: 40000, prod: { cattle: 4, goat: 6, buffalo: 2 }, level: 1 },
    school: { name: '🏫 مدرسة', cost: 45000, boost: 'exp', level: 1 },
    court: { name: '⚖️ محكمة', cost: 50000, level: 1 },
    garage: { name: '🚗 كراج', cost: 30000, prod: { car: 1 }, level: 1 },
    barracks: { name: '🏰 ثكنة', cost: 40000, prod: { soldier: 2 }, level: 1 },
    university: { name: '📚 جامعة', cost: 100000, boost: 'research', level: 1 },
    museum: { name: '🏛️ متحف', cost: 80000, boost: 'artifacts', level: 1 },
    stadium: { name: '🏟️ ملعب', cost: 70000, boost: 'entertainment', level: 1 },
    bank: { name: '🏦 بنك', cost: 90000, boost: 'interest', level: 1 }
};

const MILITARY = {
    soldier: { name: '🪖 جندي', cost: 600, power: 12, upkeep: 10 },
    archer: { name: '🏹 رامي سهام', cost: 800, power: 18, upkeep: 12 },
    cavalry: { name: '🐴 فارس', cost: 1500, power: 35, upkeep: 20 },
    car: { name: '🚗 سيارة', cost: 2500, power: 50, upkeep: 30 },
    tank: { name: '🚜 دبابة', cost: 6000, power: 180, upkeep: 80 },
    missile_weak: { name: '🚀 صاروخ ضعيف', cost: 20000, power: 600, upkeep: 100 },
    missile_mid: { name: '💥 صاروخ متوسط', cost: 50000, power: 1800, upkeep: 250 },
    missile_strong: { name: '☢️ صاروخ قوي', cost: 120000, power: 6000, upkeep: 500 },
    nuke: { name: '☢️ صاروخ نووي', cost: 600000, power: 30000, upkeep: 1000 }
};

const RANKS = {
    citizen: { name: '👤 مواطن', salary: 25, perms: [] },
    farmer: { name: '🧑‍🌾 مزارع', salary: 35, perms: ['farm'] },
    miner: { name: '⛏️ عامل منجم', salary: 45, perms: ['mine'] },
    trader: { name: '🏪 تاجر', salary: 60, perms: ['trade'] },
    teacher: { name: '👨‍🏫 معلم', salary: 70, perms: ['teach'] },
    scientist: { name: '🔬 عالم', salary: 100, perms: ['research'] },
    judge: { name: '⚖️ قاضي', salary: 150, perms: ['jail', 'law'] },
    general: { name: '⭐ جنرال', salary: 300, perms: ['recruit', 'attack', 'military'] },
    minister: { name: '👑 وزير', salary: 500, perms: ['all'] }
};

const RESEARCH_TECH = {
    agriculture: { name: '🌾 الزراعة المتقدمة', cost: 50000, time: 24, boost: 1.2 },
    mining: { name: '⛏️ التعدين المتطور', cost: 60000, time: 24, boost: 1.3 },
    warfare: { name: '⚔️ فنون الحرب', cost: 80000, time: 48, boost: 1.5 },
    architecture: { name: '🏗️ الهندسة المعمارية', cost: 70000, time: 36, boost: 1.2 },
    medicine: { name: '⚕️ الطب', cost: 90000, time: 48, boost: 1.4 },
    diplomacy: { name: '🤝 الدبلوماسية', cost: 40000, time: 12, boost: 1.1 }
};

const ACHIEVEMENTS = {
    first_city: { name: '🏙️ مدينتي الأولى', reward: 5000 },
    "100_gold": { name: '💰 مليونير', reward: 10000 }, // لازم كوتيشن عشان بيبدأ برقم
    rich_city: { name: '💎 مدينة غنية', reward: 20000 },
    strong_army: { name: '⚔️ جيش قوي', reward: 15000 },
    married: { name: '💑 متزوج', reward: 5000 },
    alliance_leader: { name: '🤝 قائد تحالف', reward: 25000 },
    explorer: { name: '🗺️ مستكشف', reward: 8000 },
    scientist: { name: '🔬 عالم', reward: 12000 }
};

// ════════════ HELPER FUNCTIONS ════════════
const getPlayer = (id) => {
    if (!db.players[id]) {
        db.players[id] = {
            id,
            cityId: null,
            rank: 'citizen',
            gold: 5000,
            balance: 0,
            isJailed: false,
            jailTime: 0,
            lastWork: 0,
            lastAttack: 0,
            lastExplore: 0,
            lastResearch: 0,
            lastDaily: 0,
            exp: 0,
            level: 1,
            spouse: null,
            alliance: null,
            achievements: [],
            inventory: {}
        };
        save();
    }
    return db.players[id];
};

const getCity = (ownerId, guildId) => {
    const key = `${guildId}_${ownerId}`;
    if (!db.cities[key]) {
        db.cities[key] = {
            id: key,
            owner: ownerId,
            guild: guildId,
            name: 'مدينة جديدة',
            gold: 50000,
            citizens: [ownerId],
            buildings: {
                mine: 0, desert: 0, farm: 0, ranch: 0, school: 0, court: 0,
                garage: 0, barracks: 0, university: 0, museum: 0, stadium: 0, bank: 0
            },
            resources: {
                gold: 0, iron: 0, stone: 0, wheat: 0, cattle: 0, goat: 0, buffalo: 0
            },
            military: {
                soldier: 0, archer: 0, cavalry: 0, car: 0, tank: 0,
                missile_weak: 0, missile_mid: 0, missile_strong: 0, nuke: 0
            },
            power: 0,
            tax: 0.15,
            lastCollect: 0,
            satisfaction: 50,
            defense: 0,
            level: 1,
            victories: 0,
            defeats: 0,
            research: {},
            artifacts: []
        };
        save();
    }
    return db.cities[key];
};

const calcPower = (city) => {
    let power = 0;
    for (const [unit, data] of Object.entries(MILITARY)) {
        power += (city.military[unit] || 0) * data.power;
    }
    return power;
};

const calcSalaries = (city) => {
    let total = 0;
    for (const id of city.citizens) {
        total += RANKS[getPlayer(id).rank].salary;
    }
    return total;
};

const calcUpkeep = (city) => {
    let total = 0;
    for (const [unit, data] of Object.entries(MILITARY)) {
        total += (city.military[unit] || 0) * data.upkeep;
    }
    return total;
};

const hasPerm = (player, city) => {
    return city.owner === player.id || player.id === BOT_OWNER || RANKS[player.rank].perms.includes('all');
};

const createEmbed = (title, description = '', color = 0xFFD700) => {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
};

const levelUp = (player) => {
    const expRequired = player.level * 100;
    if (player.exp >= expRequired) {
        player.level++;
        player.exp = 0;
        player.gold += player.level * 500;
        return true;
    }
    return false;
};

const gainExp = (player, amount) => {
    player.exp += amount;
    while (levelUp(player)) {}
};

// ════════════ COMMAND SYSTEM ════════════
const commands = {};

const registerCommand = (name, callback) => {
    commands[name] = callback;
};

// ════════════ أوامر المدينة ════════════
registerCommand('انشاء', async (msg, args, player) => {
    if (!player.cityId) return msg.reply('❌ معندكش مدينة. استخدم `!انشاء [اسم]`');
    
    const city = db.cities[player.cityId];
    if (!city) return msg.reply('❌ المدينة غير موجودة في قاعدة البيانات');
    
    city.power = calcPower(city);
    
    // حماية لو القيم ناقصة عشان ميضربش error
    city.level = city.level || 1;
    city.victories = city.victories || 0;
    city.defense = city.defense || Math.floor(city.power * 0.3);
    city.satisfaction = city.satisfaction || 50;
    city.buildings = city.buildings || { mine: 0, farm: 0, bank: 0, university: 0, desert: 0, ranch: 0, school: 0, court: 0, garage: 0, barracks: 0 };
    const embed = new EmbedBuilder()
.setColor(0xFFD700)
.setTitle(`🏙️ ${city.name}`)
.addFields(
    { name: '👑 الحاكم', value: `<@${city.owner}>`, inline: true },
    { name: '💰 الخزينة', value: city.gold.toLocaleString(), inline: true },
    { name: '👥 السكان', value: city.citizens.length.toString(), inline: true },
    { name: '⚔️ القوة', value: city.power.toLocaleString(), inline: true },
    { name: '🛡️ الدفاع', value: city.defense.toString(), inline: true },
    { name: '😊 الرضا', value: `${city.satisfaction}%`, inline: true }
);

return msg.reply({ embeds: [embed] });
});
    
    //

registerCommand('انشاء', async (msg, args, player) => {
    if (player.cityId) return msg.reply('❌ عندك مدينة بالفعل!');
    
    const name = args.join(' ') || 'مدينة جديدة';
    const city = getCity(msg.author.id, msg.guild.id);
    city.name = name;
    player.cityId = city.id;
    player.rank = 'minister';
    player.achievements.push('first_city');
    player.gold += ACHIEVEMENTS.first_city.reward;
    save();
    
    return msg.reply(
        `✅ تم إنشاء **${name}** 🎉\n` +
        `👑 أنت الحاكم الأعلى!\n` +
        `🎁 حصلت على ${ACHIEVEMENTS.first_city.reward} دهب كمكافأة!\n` +
        `استخدم \`!مساعدة\` لرؤية الأوامر`
    );
});

registerCommand('تسمية', async (msg, args, player) => {
    if (!player.cityId) return msg.reply('❌ معندكش مدينة');
    
    const city = db.cities[player.cityId];
    if (city.owner !== msg.author.id) return msg.reply('❌ فقط الحاكم');
    
    const newName = args.join(' ');
    if (!newName) return msg.reply('⚠️ الاستخدام: `!تسمية اسم_جديد`');
    
    city.name = newName;
    save();
    return msg.reply(`✅ تم تسمية المدينة إلى **${newName}** 📍`);
});

// ════════════ أوامر الاقتصاد ════════════
registerCommand('شغل', async (msg, args, player) => {
    if (!player.cityId) return msg.reply('❌ لازم تكون في مدينة');
    if (player.isJailed) return msg.reply('⛓️ انت مسجون');
    
    const timeSinceWork = Date.now() - player.lastWork;
    if (player.lastWork && timeSinceWork < WORK_COOLDOWN) {
        const hoursLeft = Math.ceil((WORK_COOLDOWN - timeSinceWork) / 3600000);
        return msg.reply(`⏳ اشتغلت خلاص. ارجع بعد ${hoursLeft} ساعة`);
    }
    
    const baseSalary = RANKS[player.rank].salary;
    const bonus = Math.floor(Math.random() * (baseSalary * 0.5));
    const salary = baseSalary + bonus;
    
    player.gold += salary;
    gainExp(player, 8);
    player.lastWork = Date.now();
    save();
    
    return msg.reply(
        `💼 اشتغلت كـ **${RANKS[player.rank].name}**\n` +
        `💰 قبضت ${salary} دهب\n` +
        `⭐ خبرة +8 | المستوى: ${player.level}`
    );
});

registerCommand('بونص-يومي', async (msg, args, player) => {
    const timeSinceDaily = Date.now() - player.lastDaily;
    if (player.lastDaily && timeSinceDaily < DAILY_BONUS_COOLDOWN) {
        const hoursLeft = Math.ceil((DAILY_BONUS_COOLDOWN - timeSinceDaily) / 3600000);
        return msg.reply(`⏳ عدت بعد ${hoursLeft} ساعة`);
    }
    
    const bonus = 2000 + Math.floor(Math.random() * 3000);
    player.gold += bonus;
    player.lastDaily = Date.now();
    save();
    
    return msg.reply(`🎁 حصلت على بونص يومي: **${bonus} دهب**`);
});

// ════════════ أوامر البناء ════════════
registerCommand('بناء', async (msg, args, player) => {
    if (!player.cityId) return msg.reply('❌ معندكش مدينة. استخدم `!انشاء [اسم]`');

    const city = db.cities[player.cityId];
    if (!city) return msg.reply('❌ المدينة غير موجودة');
    if (!hasPerm(player, city)) return msg.reply('❌ فقط الحاكم يقدر يبني');

    // تأكد المباني موجودة
    city.buildings = city.buildings || { mine: 0, farm: 0, bank: 0, university: 0, desert: 0, ranch: 0, school: 0, court: 0, garage: 0, barracks: 0 };

    // خطوة 1: قائمة منسدلة لاختيار المبنى
    const select = new StringSelectMenuBuilder()
    .setCustomId(`build_select_${msg.author.id}`)
    .setPlaceholder('🏗️ اختر المبنى اللي عايز تبنيه')
    .addOptions(Object.entries(BUILDINGS).map(([key, val]) => ({
            label: val.name.replace(/⛏️|🏜️|🌾|🐄|🏫|⚖️|🚗|🏰|🏦|📚/, '').trim(),
            value: key,
            description: `التكلفة: ${val.cost.toLocaleString()} دهب`,
            emoji: val.name.split(' ')[0]
        })));

    const row = new ActionRowBuilder().addComponents(select);

    const m = await msg.reply({
        content: '**اختار المبنى الأول من القائمة 👇**',
        components: [row]
    });

    // خطوة 2: استقبال الاختيار
    const filter = i => i.user.id === msg.author.id && i.customId === `build_select_${msg.author.id}`;
    const collected = await m.awaitMessageComponent({ filter, time: 30000 }).catch(() => null);

    if (!collected) {
        m.delete().catch(() => {});
        return msg.channel.send('⏳ انتهى الوقت. اكتب `!بناء` تاني');
    }

    const buildType = collected.values[0];
    const building = BUILDINGS[buildType];

    await collected.update({
        content: `**اختارت: ${building.name}**\n💰 سعر الوحدة: ${building.cost.toLocaleString()} دهب\nاكتب العدد اللي عايز تبنيه في الشات الآن...\nمثال: \`10\` أو \`20\`\nاكتب \`إلغاء\` للإلغاء`,
        components: []
    });

    // خطوة 3: استقبال العدد من الشات
    const msgFilter = response => response.author.id === msg.author.id;
    const msgs = await msg.channel.awaitMessages({
        filter: msgFilter,
        max: 1,
        time: 30000,
        errors: ['time']
    }).catch(() => null);

    if (!msgs) return msg.channel.send('⏳ انتهى الوقت');

    const amountMsg = msgs.first();
    const amount = amountMsg.content.trim().toLowerCase();

    if (amount === 'إلغاء' || amount === 'cancel') {
        amountMsg.delete().catch(() => {});
        return msg.channel.send('❌ تم إلغاء البناء');
    }

    const num = parseInt(amount);
    if (isNaN(num) || num < 1) {
        amountMsg.delete().catch(() => {});
        return msg.channel.send('❌ اكتب رقم صحيح أكبر من 0');
    }

    if (num > 100) {
        amountMsg.delete().catch(() => {});
        return msg.channel.send('❌ الحد الأقصى 100 مبنى مرة واحدة عشان الاقتصاد');
    }

    const totalCost = building.cost * num;
    if (city.gold < totalCost) {
        amountMsg.delete().catch(() => {});
        return msg.channel.send(`❌ دهب المدينة مش كافي\nمحتاج: ${totalCost.toLocaleString()} دهب\nمعاك: ${city.gold.toLocaleString()} دهب`);
    }

    // البناء
    //... كل الكود اللي فوق

    // البناء
    city.gold -= totalCost;
    city.buildings[buildType] += num;
    city.power = calcPower(city);
    gainExp(player, 15 * num);
    save();

    amountMsg.delete().catch(() => {});

    return msg.channel.send({ embeds: [new EmbedBuilder()
       .setColor(0x2ecc71)
       .setTitle('✅ تم البناء بنجاح')
       .setDescription(`🏗️ بنيت **${num}x ${building.name}**\n💰 التكلفة الإجمالية: ${totalCost.toLocaleString()} دهب\n🏢 العدد الجديد: ${city.buildings[buildType]}\n🥇 باقي في الخزينة: ${city.gold.toLocaleString()} دهب\n⭐ خبرة +${15 * num}`)
    ]});
}); // دي قفلة registerCommand; 
    
            
// بعده كود ضبط الدنيا بتاعك
registerCommand('ترقية-مبنى', async (msg, args, player) => {
    if (!player.cityId) return msg.reply('❌ معندكش مدينة');
    
    const city = db.cities[player.cityId];
    if (!hasPerm(player, city)) return msg.reply('❌ فقط الحاكم');
    
    const buildType = args[0]?.toLowerCase();
    if (!buildType || !BUILDINGS[buildType]) return msg.reply('❌ مبنى غير موجود');
    
    const building = BUILDINGS[buildType];
    const count = city.buildings[buildType] || 0;
    if (count === 0) return msg.reply('❌ لم تبني هذا المبنى بعد');
    
    const upgradeCost = Math.floor(building.cost * (count + 1) * 0.5);
    if (city.gold < upgradeCost) return msg.reply(`❌ محتاج ${upgradeCost.toLocaleString()} دهب`);
    
    city.gold -= upgradeCost;
    building.level++;
    if (building.prod) {
        for (const [resource, amount] of Object.entries(building.prod)) {
            building.prod[resource] = Math.floor(amount * 1.2);
        }
    }
    gainExp(player, 20);
    save();
    
    return msg.reply(`⬆️ تم ترقية **${building.name}** إلى المستوى ${building.level}\n📈 الإنتاجية زادت بـ 20%`);
});

// ════════════ أوامر التجنيد والجيش ════════════
registerCommand('جند', async (msg, args, player) => {
    if (!player.cityId) return msg.reply('❌ معندكش مدينة');
    
    const city = db.cities[player.cityId];
    if (city.buildings.barracks === 0) return msg.reply('❌ ابني ثكنة الأول');
    
    const unitType = args[0]?.toLowerCase();
    const amount = parseInt(args[1]) || 1;
    
    if (!unitType || !MILITARY[unitType]) return msg.reply('❌ وحدة عسكرية غير موجودة');
    
    const unit = MILITARY[unitType];
    const totalCost = unit.cost * amount;
    
    if (city.gold < totalCost) return msg.reply(`❌ محتاج ${totalCost.toLocaleString()} دهب`);
    
    city.gold -= totalCost;
    city.military[unitType] = (city.military[unitType] || 0) + amount;
    city.power = calcPower(city);
    gainExp(player, 10 * amount);
    save();
    
    return msg.reply(
        `🪖 تم تجنيد **${amount}** من ${unit.name}\n` +
        `⚔️ القوة الكلية: ${city.power.toLocaleString()}`
    );
});

registerCommand('الجيش', async (msg, args, player) => {
    if (!player.cityId) return msg.reply('❌ معندكش مدينة');
    
    const city = db.cities[player.cityId];
    let militaryList = `**جيش ${city.name}** ⚔️\n`;
    let totalPower = 0;
    
    for (const [unit, data] of Object.entries(MILITARY)) {
        const count = city.military[unit] || 0;
        if (count > 0) {
            const power = count * data.power;
            totalPower += power;
            militaryList += `${data.name}: ${count} (⚡ ${power})\n`;
        }
    }
    
    militaryList += `\n📊 القوة الكلية: **${totalPower.toLocaleString()}**`;
    
    return msg.reply(militaryList);
});

// ════════════ أوامر الحرب والهجوم ════════════
registerCommand('هجوم', async (msg, args, player) => {
    if (!player.cityId) return msg.reply('❌ معندكش مدينة');
    
    const city = db.cities[player.cityId];
    if (city.military.soldier === 0) return msg.reply('❌ لازم تكون عندك جيش');
    
    const timeSinceAttack = Date.now() - player.lastAttack;
    if (player.lastAttack && timeSinceAttack < ATTACK_COOLDOWN) {
        const hoursLeft = Math.ceil((ATTACK_COOLDOWN - timeSinceAttack) / 3600000);
        return msg.reply(`⏳ استنى ${hoursLeft} ساعة قبل الهجوم الجديد`);
    }
    
    const targetName = args.join(' ');
    const targetCity = Object.values(db.cities).find(c => c.name === targetName && c.guild === msg.guild.id);
    
    if (!targetCity) return msg.reply('❌ المدينة غير موجودة');
    if (targetCity.id === city.id) return msg.reply('❌ لا تستطيع مهاجمة نفسك');
    
    const attackPower = calcPower(city);
    const defendPower = calcPower(targetCity);
    const attackBonus = city.level * 100;
    const defendBonus = targetCity.level * 100;
    
    const finalAttackPower = attackPower + attackBonus;
    const finalDefendPower = defendPower + defendBonus;
    
    const successChance = finalAttackPower / (finalAttackPower + finalDefendPower);
    const isSuccess = Math.random() < successChance;
    
    let reward = 0;
    if (isSuccess) {
        reward = Math.floor(targetCity.gold * 0.15);
        targetCity.gold = Math.max(0, targetCity.gold - reward);
        city.gold += reward;
        city.victories++;
        city.satisfaction = Math.max(0, city.satisfaction - 10);
        targetCity.satisfaction = Math.max(0, targetCity.satisfaction - 20);
        gainExp(player, 50);
    } else {
        city.satisfaction = Math.max(0, city.satisfaction - 15);
        targetCity.satisfaction = Math.min(100, targetCity.satisfaction + 10);
    }
    
    player.lastAttack = Date.now();
    save();
    
    if (isSuccess) {
        return msg.reply(
            `🎉 **النصر!** 🎉\n` +
            `هاجمت **${targetCity.name}** بنجاح!\n` +
            `💰 غنمت ${reward.toLocaleString()} دهب`
        );
    } else {
        return msg.reply(
            `❌ **الهزيمة!** ❌\n` +
            `حاولت مهاجمة **${targetCity.name}** لكن فشلت\n` +
            `دفعوك برجالهم!`
        );
    }
});

registerCommand('دفاع', async (msg, args, player) => {
    if (!player.cityId) return msg.reply('❌ معندكش مدينة');
    
    const city = db.cities[player.cityId];
    if (!hasPerm(player, city)) return msg.reply('❌ فقط الحاكم');
    
    const amount = parseInt(args[0]) || 1000;
    if (city.gold < amount) return msg.reply(`❌ محتاج ${amount.toLocaleString()} دهب`);
    
    city.gold -= amount;
    city.defense += amount * 0.1;
    gainExp(player, 25);
    save();
    
    return msg.reply(`🛡️ تم تحسين الدفاع\n🛡️ الدفاع الكلي: ${city.defense.toFixed(0)}`);
});

// ════════════ أوامر التجارة ════════════
registerCommand('سوق', async (msg, args, player) => {
    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('market_action')
            .setPlaceholder('اختر نوع العملية')
            .addOptions([
                { label: '🛒 شراء موارد', value: 'buy' },
                { label: '💰 بيع موارد', value: 'sell' }
            ])
    );
    msg.reply({ content: 'اختر العملية:', components: [row] });
});

client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'market_action') {
        const action = interaction.values[0];
        const resourceMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`res_select_${action}`)
                .setPlaceholder('اختر المورد')
                .addOptions(Object.keys(RESOURCES).map(k => ({ label: RESOURCES[k].name, value: k })))
        );
        return interaction.update({ content: 'اختر المورد:', components: [resourceMenu] });
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('res_select_')) {
        const action = interaction.customId.split('_')[2];
        const resKey = interaction.values[0];
        const modal = new ModalBuilder().setCustomId(`modal_amount_${action}_${resKey}`).setTitle('تحديد الكمية');
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('amount').setLabel('اكتب العدد').setStyle(TextInputStyle.Short)
        ));
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_amount_')) {
        const [_, __, action, resKey] = interaction.customId.split('_');
        const amount = parseInt(interaction.fields.getTextInputValue('amount'));
        const player = getPlayer(interaction.user.id);
        const city = db.cities[player.cityId];
        const res = RESOURCES[resKey];

        if (action === 'buy') {
            const total = res.buy * amount;
            if (city.gold < total) return interaction.reply({ content: '❌ ذهب غير كافي', ephemeral: true });
            city.gold -= total;
            city.resources[resKey] = (city.resources[resKey] || 0) + amount;
        } else {
            if ((city.resources[resKey] || 0) < amount) return interaction.reply({ content: '❌ لا تملك هذه الكمية', ephemeral: true });
            city.gold += res.sell * amount;
            city.resources[resKey] -= amount;
        }
        save();

        const embed = new EmbedBuilder()
            .setTitle(`🏰 ${city.name}`)
            .addFields(
                { name: '💰 الذهب', value: city.gold.toLocaleString(), inline: true },
                { name: '📦 الموارد', value: Object.entries(city.resources).map(([k, v]) => `${RESOURCES[k].icon} ${v}`).join('\n'), inline: true }
            );
        await interaction.reply({ content: '✅ تمت العملية!', embeds: [embed] });
    }
});

registerCommand('تطوير', async (msg, args, player) => {
    const city = db.cities[player.cityId];
    const building = args[0]; // مثال: "سور", "مخزن"
    
    if (!city.buildings) city.buildings = { "سور": 1 };
    
    const cost = city.buildings[building] * 500;
    if (city.gold < cost) return msg.reply('❌ ذهب غير كافي للتطوير!');
    
    city.gold -= cost;
    city.buildings[building] += 1;
    save();
    msg.reply(`✅ تم تطوير **${building}** إلى مستوى ${city.buildings[building]}`);
});

registerCommand('مبارزة', async (msg, args, player) => {
    const opponent = msg.mentions.users.first();
    if (!opponent) return msg.reply('من تريد تحدي؟');
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('accept_duel').setLabel('قبول التحدي').setStyle(ButtonStyle.Success)
    );
    
    msg.channel.send({ content: `${opponent}، هناك من يتحداك في مبارزة!`, components: [row] });
});

client.on('interactionCreate', async (interaction) => {

    if (!interaction.isButton()) return;

    if (interaction.customId === 'accept_duel') {

        // الشخص الذي ضغط على الزر
        const acceptor = interaction.user;

        // صاحب التحدي
        const challengerId = interaction.message.content.match(/\d{17,20}/)?.[0];

        if (!challengerId) {
            return interaction.reply({
                content: '❌ تعذر معرفة صاحب التحدي',
                ephemeral: true
            });
        }

        const challenger = await client.users.fetch(challengerId);

        // اختيار الفائز
        const winner = Math.random() > 0.5
            ? acceptor
            : challenger;

        await interaction.update({
            content:
                `⚔️ انتهت المبارزة!\n\n` +
                `🥇 الفائز: ${winner}\n` +
                `🎉 مبروك له النصر`,
            components: []
        });

    }

});


// إضافة للـ DB: alliances: { [id]: { members: [], gold: 0 } }
registerCommand('تحالف', async (msg, args, player) => {
    const action = args[0];
    if (action === 'إنشاء') {
        const name = args[1];
        db.alliances[msg.author.id] = { name, members: [msg.author.id], gold: 0 };
        save();
        msg.reply(`✅ تم إنشاء التحالف **${name}** بنجاح!`);
    } else if (action === 'انضمام') {
        const target = msg.mentions.users.first();
        db.alliances[target.id].members.push(msg.author.id);
        save();
        msg.reply('🤝 تم الانضمام للتحالف!');
    }
});

// دالة مساعدة لتطبيق مكافأة
function calculateReward(player, baseReward) {
    let multiplier = 1;
    // إذا كان لدى اللاعب "ميدالية شجاعة" في الموارد
    if (db.cities[player.cityId].resources['ميدالية'] > 0) multiplier = 2;
    return baseReward * multiplier;
}

let blackMarketItems = ["سيف أسطوري", "جرعة طاقة", "خريطة كنز"];

registerCommand('سوق-سوداء', async (msg, args, player) => {
    const item = blackMarketItems[Math.floor(Math.random() * blackMarketItems.length)];
    msg.reply(`🕵️‍♂️ التاجر السري يعرض عليك: **${item}** مقابل 10,000 ذهب! اكتب ` + '`!شراء-سري`');
});

registerCommand('حماية', async (msg, args, player) => {
    const city = db.cities[player.cityId];
    if (city.gold < 2000) return msg.reply('❌ الحماية تكلف 2000 ذهب.');
    
    city.gold -= 2000;
    city.shieldUntil = Date.now() + (24 * 60 * 60 * 1000); // 24 ساعة
    save();
    msg.reply('🛡️ تم تفعيل درع الحماية لمدينتك لمدة 24 ساعة.');
});


// ════════════ أوامر الاستكشاف ════════════
registerCommand('استكشاف', async (msg, args, player) => {
    if (!player.cityId) return msg.reply('❌ معندكش مدينة');
    
    const timeSinceExplore = Date.now() - player.lastExplore;
    if (player.lastExplore && timeSinceExplore < EXPLORE_COOLDOWN) {
        const hoursLeft = Math.ceil((EXPLORE_COOLDOWN - timeSinceExplore) / 3600000);
        return msg.reply(`⏳ استنى ${hoursLeft} ساعة قبل الاستكشاف الجديد`);
    }
    
    const discoveries = [
        { name: '🪙 كنز ذهبي', reward: Math.floor(Math.random() * 10000) + 5000 },
        { name: '🏛️ آثار قديمة', reward: Math.floor(Math.random() * 8000) + 3000 },
        { name: '💎 جواهر نادرة', reward: Math.floor(Math.random() * 7000) + 4000 },
        { name: '📜 خريطة الكنز', reward: Math.floor(Math.random() * 6000) + 2000 },
        { name: '🗿 تمثال عملاق', reward: 1000 },
        { name: '⛏️ منجم مخفي', reward: 3000 }
    ];
    
    const discovery = discoveries[Math.floor(Math.random() * discoveries.length)];
    const city = db.cities[player.cityId];
    
    city.gold += discovery.reward;
    if (!city.artifacts) city.artifacts = [];
    city.artifacts.push(discovery.name);
    player.lastExplore = Date.now();
    gainExp(player, 30);
    save();
    
    return msg.reply(
        `🗺️ **اكتشاف جديد!** 🗺️\n` +
        `عثرت على: **${discovery.name}**\n` +
        `💰 حصلت على ${discovery.reward.toLocaleString()} دهب\n` +
        `⭐ خبرة +30`
    );
});

// ════════════ أوامر البحث العلمي ════════════
registerCommand('بحث', async (msg, args, player) => {
    if (!player.cityId) return msg.reply('❌ معندكش مدينة');
    
    const city = db.cities[player.cityId];
    if (city.buildings.university === 0) return msg.reply('❌ ابني جامعة الأول');
    
    if (args.length === 0) {
        let techList = '**التقنيات المتاحة:**\n';
        for (const [key, tech] of Object.entries(RESEARCH_TECH)) {
            techList += `\`${key}\` - ${tech.name} (${tech.cost.toLocaleString()} دهب, ${tech.time} ساعة)\n`;
        }
        return msg.reply(techList);
    }
    
    const techType = args[0].toLowerCase();
    const tech = RESEARCH_TECH[techType];
    
    if (!tech) return msg.reply('❌ تقنية غير موجودة');
    if (city.gold < tech.cost) return msg.reply(`❌ محتاج ${tech.cost.toLocaleString()} دهب`);
    if (city.research[techType]) return msg.reply(`✅ لديك هذه التقنية بالفعل`);
    
    city.gold -= tech.cost;
    city.research[techType] = Date.now() + (tech.time * 60 * 60 * 1000);
    gainExp(player, 40);
    save();
    
    return msg.reply(
        `🔬 بدأت البحث: **${tech.name}**\n` +
        `⏱️ سينتهي في ${tech.time} ساعة\n` +
        `📈 الزيادة: x${tech.boost}`
    );
});

registerCommand('تقنيات', async (msg, args, player) => {
    if (!player.cityId) return msg.reply('❌ معندكش مدينة');
    
    const city = db.cities[player.cityId];
    let techList = `**تقنيات ${city.name}** 🔬\n`;
    
    let hasResearch = false;
    for (const [key, time] of Object.entries(city.research)) {
        hasResearch = true;
        const tech = RESEARCH_TECH[key];
        const remainingTime = Math.ceil((time - Date.now()) / (60 * 60 * 1000));
        
        if (remainingTime > 0) {
            techList += `⏳ ${tech.name}: ${remainingTime} ساعة متبقية\n`;
        } else {
            techList += `✅ ${tech.name}\n`;
        }
    }
    
    if (!hasResearch) techList += '❌ لا توجد تقنيات';
    
    return msg.reply(techList);
});

// ════════════ أوامر الزواج والتحالفات ════════════
registerCommand('زواج', async (msg, args, player) => {
    const target = msg.mentions.users.first();
    if (!target) return msg.reply('⚠️ الاستخدام: `!زواج @الشخص`');
    
    const targetPlayer = getPlayer(target.id);
    
    if (player.spouse) return msg.reply('❌ أنت متزوج بالفعل');
    if (targetPlayer.spouse) return msg.reply('❌ هذا الشخص متزوج بالفعل');
    
    const embed = createEmbed('💍 طلب زواج', `<@${msg.author.id}> يطلب الزواج من <@${target.id}>`)
        .addFields(
            { name: '✅ قبول', value: 'اضغط ✅', inline: true },
            { name: '❌ رفض', value: 'اضغط ❌', inline: true }
        );
    
    const reply = await msg.reply({ embeds: [embed] });
    await reply.react('✅');
    await reply.react('❌');
    
    const filter = (reaction, user) => (reaction.emoji.name === '✅' || reaction.emoji.name === '❌') && user.id === target.id;
    const collector = reply.createReactionCollector({ filter, time: 60000 });
    
    collector.on('collect', (reaction) => {
        if (reaction.emoji.name === '✅') {
            player.spouse = target.id;
            targetPlayer.spouse = msg.author.id;
            if (!db.marriages) db.marriages = [];
            db.marriages.push({ user1: msg.author.id, user2: target.id, date: Date.now() });
            player.achievements.push('married');
            targetPlayer.achievements.push('married');
            player.gold += ACHIEVEMENTS.married.reward;
            targetPlayer.gold += ACHIEVEMENTS.married.reward;
            save();
            
            msg.channel.send(`💍 **تم الزواج!** 💍\n<@${msg.author.id}> ❤️ <@${target.id}>\n🎁 حصل كل منهما على ${ACHIEVEMENTS.married.reward} دهب`);
        } else {
            msg.channel.send(`❌ تم رفض الطلب`);
        }
        collector.stop();
    });
});

registerCommand('تحالف', async (msg, args, player) => {
    if (!player.cityId) return msg.reply('❌ معندكش مدينة');
    
    const city = db.cities[player.cityId];
    if (!hasPerm(player, city)) return msg.reply('❌ فقط الحاكم');
    
    const target = msg.mentions.users.first();
    if (!target) return msg.reply('⚠️ الاستخدام: `!تحالف @الحاكم`');
    
    const targetPlayer = getPlayer(target.id);
    if (!targetPlayer.cityId) return msg.reply('❌ هذا الشخص معندوش مدينة');
    
    const targetCity = db.cities[targetPlayer.cityId];
    
    if (!db.alliances) db.alliances = [];
    const alliance = {
        leader: msg.author.id,
        cities: [city.id, targetCity.id],
        members: [msg.author.id, target.id],
        date: Date.now(),
        strength: calcPower(city) + calcPower(targetCity)
    };
    
    db.alliances.push(alliance);
    player.alliance = db.alliances.indexOf(alliance);
    targetPlayer.alliance = db.alliances.indexOf(alliance);
    player.achievements.push('alliance_leader');
    player.gold += ACHIEVEMENTS.alliance_leader.reward;
    save();
    
    return msg.reply(
        `🤝 **تم تكوين تحالف!** 🤝\n` +
        `${city.name} ❤️ ${targetCity.name}\n` +
        `💪 القوة المتحدة: ${alliance.strength.toLocaleString()}`
    );
});

// ════════════ أوامر الترتيبات ════════════
registerCommand('ترتيب-مدن', async (msg, args, player) => {
    const cities = Object.values(db.cities)
        .filter(c => c.guild === msg.guild.id)
        .sort((a, b) => calcPower(b) - calcPower(a))
        .slice(0, 10);
    
    let leaderboard = '**🏆 ترتيب أقوى المدن** 🏆\n\n';
    cities.forEach((city, i) => {
        leaderboard += `${i + 1}. **${city.name}** - ⚡ ${calcPower(city).toLocaleString()}\n`;
    });
    
    return msg.reply(leaderboard);
});

registerCommand('ترتيب-لاعبين', async (msg, args, player) => {
    const players = Object.values(db.players)
        .filter(p => p.cityId)
        .sort((a, b) => b.level - a.level || b.exp - a.exp)
        .slice(0, 10);
    
    let leaderboard = '**⭐ ترتيب أقوى اللاعبين** ⭐\n\n';
    players.forEach((p, i) => {
        leaderboard += `${i + 1}. <@${p.id}> - المستوى: ${p.level} | الخبرة: ${p.exp}\n`;
    });
    
    return msg.reply(leaderboard);
});

// ════════════ أوامر السجن والعدالة ════════════
registerCommand('سجن', async (msg, args, player) => {
    if (!player.cityId) return msg.reply('❌ معندكش مدينة');
    
    const city = db.cities[player.cityId];
    const p = getPlayer(msg.author.id);
    
    if (p.rank !== 'judge' && city.owner !== msg.author.id) {
        return msg.reply('❌ القضاة والحاكم بس يقدرون يسجنوا');
    }
    
    if (city.buildings.court === 0) return msg.reply('❌ ابني محكمة الأول');
    
    const target = msg.mentions.users.first();
    const time = args[1];
    const reason = args.slice(2).join(' ') || 'بدون سبب';
    
    if (!target || !time) return msg.reply('⚠️ الاستخدام: `!سجن @العضو 2h السبب`');
    
    const targetPlayer = getPlayer(target.id);
    if (targetPlayer.cityId !== city.id) return msg.reply('❌ مش من مدينتك');
    
    let ms = 0;
    if (time.endsWith('h')) ms = parseInt(time) * 3600000;
    else if (time.endsWith('m')) ms = parseInt(time) * 60000;
    else if (time.endsWith('d')) ms = parseInt(time) * 86400000;
    
    if (ms <= 0) return msg.reply('⚠️ الوقت غير صحيح');
    
    targetPlayer.isJailed = true;
    targetPlayer.jailTime = Date.now() + ms;
    targetPlayer.jailReason = reason;
    save();
    
    try {
        await target.send(`⛓️ اتحكم عليك بالسجن ${time} بتهمة: ${reason}`);
    } catch (err) {}
    
    return msg.reply(`⚖️ تم سجن <@${target.id}> لمدة ${time} بتهمة ${reason}`);
});

registerCommand('استئناف', async (msg, args, player) => {
    const p = getPlayer(msg.author.id);
    if (!p.isJailed) return msg.reply('❌ انت مش مسجون');
    
    const fine = parseInt(args[0]) || 10000;
    if (p.gold < fine) return msg.reply(`❌ محتاج ${fine} دهب للاستئناف. عندك ${p.gold}`);
    
    p.gold -= fine;
    p.isJailed = false;
    p.jailTime = 0;
    save();
    
    return msg.reply(`⚖️ تم قبول الاستئناف ودفعت ${fine} دهب. انت حر!`);
});

// ════════════ أوامر المساعدة ════════════
registerCommand('مساعدة', async (msg, args, player) => {
    const embed = createEmbed('📖 دليل الأوامر الكامل', '🎮 لعبة حرب الممالك')
        .addFields(
            { name: '🏙️ أوامر المدينة', value: '`!انشاء` `!مدينتي` `!تسمية` `!مواطنين`', inline: false },
            { name: '💰 أوامر الاقتصاد', value: '`!رصيدي` `!شغل` `!بونص-يومي` `!ترقية-مبنى`', inline: false },
            { name: '🏗️ أوامر البناء', value: '`!بناء` [اسم] أو اضغط ايموجي للقائمة', inline: false },
            { name: '🪖 أوامر الجيش', value: '`!جند` [وحدة] [العدد] `!الجيش`', inline: false },
            { name: '⚔️ أوامر الحرب', value: '`!هجوم` [اسم المدينة] `!دفاع` [المبلغ]', inline: false },
            { name: '🏪 أوامر التجارة', value: '`!سوق` `!شراء` `!بيع`', inline: false },
            { name: '🗺️ أوامر الاستكشاف', value: '`!استكشاف` - احصل على كنوز وآثار', inline: false },
            { name: '🔬 أوامر البحث', value: '`!بحث` [تقنية] `!تقنيات`', inline: false },
            { name: '💍 أوامر اجتماعية', value: '`!زواج` `!تحالف`', inline: false },
            { name: '🏆 أوامر الترتيبات', value: '`!ترتيب-مدن` `!ترتيب-لاعبين`', inline: false },
            { name: '⚖️ أوامر العدالة', value: '`!سجن` `!استئناف`', inline: false }
        )
        .setColor(0x00FF00);
    
    return msg.reply({ embeds: [embed] });
});

// ════════════ MESSAGE HANDLER ════════════
client.on('messageCreate', async (msg) => {
    try {
        if (msg.author.bot || !msg.content.startsWith(PREFIX)) return;
        
        const args = msg.content.slice(PREFIX.length).trim().split(/\s+/);
        const cmd = args.shift().toLowerCase();
        const player = getPlayer(msg.author.id);
        
        const command = commands[cmd];
        if (command) {
            await command(msg, args, player);
        } else {
            return msg.reply('❌ أمر غير موجود. استخدم `!مساعدة`');
        }
    } catch (err) {
        console.error('❌ خطأ:', err);
        msg.reply('❌ حدث خطأ').catch(console.error);
    }
});

// ════════════ SCHEDULED TASKS ════════════
const jailCheckInterval = setInterval(() => {
    try {
        Object.values(db.players).forEach(p => {
            if (p.isJailed && p.jailTime && p.jailTime <= Date.now()) {
                p.isJailed = false;
                p.jailTime = 0;
                save();
            }
        });
    } catch (err) {
        console.error('❌ خطأ فحص السجن:', err);
    }
}, 60000);

// أضف هذا الجزء تحت قسم الأوامر
registerCommand('محاكمة', async (msg, args, player) => {
    const channel = client.channels.cache.get('1516070860262473748');
    if (!channel) return msg.reply('❌ لم يتم تحديد قناة المحكمة في الإعدادات!');

    const target = msg.mentions.users.first();
    if (!target) return msg.reply('⚠️ الاستخدام: `!محاكمة @العضو [السبب]`');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verdict_guilty').setLabel('مذنب').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('verdict_innocent').setLabel('بريء').setStyle(ButtonStyle.Success)
    );

    const embed = new EmbedBuilder()
        .setTitle('⚖️ قضية جديدة')
        .setDescription(`المتهم: ${target}\nالسبب: ${args.slice(1).join(' ')}`)
        .setColor(0xFF0000);

    channel.send({ embeds: [embed], components: [row] });
    msg.reply('✅ تم إرسال القضية للمحكمة.');
});

registerCommand('قرض', async (msg, args, player) => {
    const amount = parseInt(args[0]);
    if (!amount || amount > 50000) return msg.reply('⚠️ الحد الأقصى للقرض هو 50,000 دهب.');

    const adminChannel = client.channels.cache.get('1515030888906358927');
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`approve_loan_${msg.author.id}_${amount}`).setLabel('موافقة').setStyle(ButtonStyle.Success)
    );

    adminChannel.send({ content: `طلب قرض بقيمة ${amount} من <@${msg.author.id}>`, components: [row] });
    msg.reply('⏳ تم إرسال طلب القرض للمراجعة.');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    // التحقق من أن الزر هو زر القرض
    if (interaction.customId.startsWith('approve_loan_')) {
        // التحقق من صلاحيات صاحب البوت فقط
        if (interaction.user.id !== BOT_OWNER) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص لصاحب البوت فقط!', ephemeral: true });
        }

        const parts = interaction.customId.split('_');
        const playerId = parts[2];
        const amount = parseInt(parts[3]);

        // هنا نعدل بيانات اللاعب (إضافة الدهب)
        let playerData = db.players[playerId]; 
        if (playerData) {
            // افترض أن الدهب موجود في object المدينة الخاص باللاعب
            db.cities[playerData.cityId].gold += amount; 
            save(); // دالة الحفظ الخاصة بك
        }

        // تحديث الرسالة الأصلية بعد الموافقة
        await interaction.update({ 
            content: `✅ تم قبول القرض بقيمة ${amount} لـ <@${playerId}> من قبل ${interaction.user.username}`, 
            components: [] // حذف الأزرار بعد الموافقة
        });
    }
});


registerCommand('أدمن-دهب', async (msg, args, player) => {
    if (msg.author.id !== BOT_OWNER) return msg.reply('❌ هذا الأمر للمطور فقط');
    
    const target = msg.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!target || isNaN(amount)) return msg.reply('⚠️ الاستخدام: `!أدمن-دهب @الشخص 1000`');
    
    const p = getPlayer(target.id);
    if (!p.cityId) return msg.reply('❌ اللاعب ليس لديه مدينة');
    
    const city = db.cities[p.cityId];
    city.gold += amount;
    save();
    
    msg.reply(`✅ تم تعديل دهب مدينة ${city.name} بمقدار ${amount}`);
});


registerCommand('إعلان', async (msg, args, player) => {
    if (msg.author.id !== BOT_OWNER) return msg.reply('❌ هذا الأمر للمطور فقط');
    
    const message = args.join(' ');
    if (!message) return msg.reply('⚠️ اكتب نص الإعلان');
    
    const embed = new EmbedBuilder()
        .setTitle('📢 إعلان من الإدارة')
        .setDescription(message)
        .setColor(0xFF0000)
        .setTimestamp();
        
    // إرسال الإعلان لجميع السيرفرات التي يتواجد بها البوت
    client.guilds.cache.forEach(guild => {
        const channel = guild.systemChannel || guild.channels.cache.find(c => c.type === 0);
        if (channel) channel.send({ embeds: [embed] });
    });
});

// أضف متغير للملف: let isMaintenance = false;
registerCommand('صيانة', async (msg, args, player) => {
    if (msg.author.id !== BOT_OWNER) return;
    
    isMaintenance = !isMaintenance;
    msg.reply(isMaintenance ? '🛠️ تم تفعيل وضع الصيانة. الأوامر متوقفة.' : '✅ تم إنهاء الصيانة.');
});

registerCommand('تصفير', async (msg, args, player) => {
    if (msg.author.id !== BOT_OWNER) return;
    
    const target = msg.mentions.users.first();
    if (!target) return msg.reply('⚠️ حدد الشخص الذي تريد تصفير مدينته');
    
    const p = getPlayer(target.id);
    delete db.cities[p.cityId];
    p.cityId = null;
    save();
    
    msg.reply(`✅ تم حذف مدينة اللاعب ${target.username}`);
});

registerCommand('رصيدي', async (msg, args, player) => {
    const city = db.cities[player.cityId];

    const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('💰 الحساب المالي')
    .addFields(
        { name: '👤 دهب اللاعب', value: player.gold.toLocaleString(), inline: true },
        { name: '🏦 رصيد المدينة', value: city ? city.gold.toLocaleString() : '0', inline: true },
        { name: '⭐ المستوى', value: player.level.toString(), inline: true }
    );

    msg.reply({ embeds: [embed] });
});

registerCommand('تحويل', async (msg, args, player) => {

    const target = msg.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!target) return msg.reply('❌ حدد الشخص');
    if (!amount || amount <= 0) return msg.reply('❌ مبلغ غير صحيح');

    const targetPlayer = getPlayer(target.id);

    if (player.gold < amount)
        return msg.reply('❌ لا تملك هذا المبلغ');

    player.gold -= amount;
    targetPlayer.gold += amount;

    save();

    msg.reply(`✅ تم تحويل ${amount.toLocaleString()} دهب إلى ${target}`);
});


registerCommand('إيداع', async (msg, args, player) => {

    const city = db.cities[player.cityId];
    const amount = parseInt(args[0]);

    if (!amount || amount <= 0)
        return msg.reply('❌ مبلغ غير صحيح');

    if (player.gold < amount)
        return msg.reply('❌ لا تملك هذا المبلغ');

    player.gold -= amount;
    city.gold += amount;

    save();

    msg.reply(`🏦 أودعت ${amount.toLocaleString()} دهب في خزينة المدينة`);
});

registerCommand('سحب', async (msg, args, player) => {

    const city = db.cities[player.cityId];

    if (city.owner !== msg.author.id)
        return msg.reply('❌ الحاكم فقط');

    const amount = parseInt(args[0]);

    if (!amount || amount <= 0)
        return msg.reply('❌ مبلغ غير صحيح');

    if (city.gold < amount)
        return msg.reply('❌ الخزينة لا تكفي');

    city.gold -= amount;
    player.gold += amount;

    save();

    msg.reply(`💸 تم سحب ${amount.toLocaleString()} دهب`);
});

registerCommand('استثمار', async (msg, args, player) => {

    const amount = parseInt(args[0]);

    if (!amount || amount <= 0)
        return msg.reply('❌ مبلغ غير صحيح');

    if (player.gold < amount)
        return msg.reply('❌ لا تملك المبلغ');

    player.gold -= amount;

    const success = Math.random() < 0.6;

    if (success) {

        const profit = Math.floor(amount * (1 + Math.random()));

        player.gold += profit;

        msg.reply(`📈 نجح الاستثمار وربحت ${profit.toLocaleString()} دهب`);

    } else {

        msg.reply(`📉 فشل الاستثمار وخسرت ${amount.toLocaleString()} دهب`);
    }

    save();
});

registerCommand('ضرائب', async (msg, args, player) => {

    const city = db.cities[player.cityId];

    if (city.owner !== msg.author.id)
        return msg.reply('❌ الحاكم فقط');

    const percent = parseFloat(args[0]);

    if (isNaN(percent) || percent < 1 || percent > 50)
        return msg.reply('❌ من 1 إلى 50');

    city.tax = percent / 100;

    save();

    msg.reply(`🏛️ تم ضبط الضرائب على ${percent}%`);
});

registerCommand('جمع-ضرائب', async (msg, args, player) => {

    const city = db.cities[player.cityId];

    if (city.owner !== msg.author.id)
        return msg.reply('❌ الحاكم فقط');

    let collected = 0;

    city.citizens.forEach(id => {

        const p = getPlayer(id);

        const tax = Math.floor(p.gold * city.tax);

        p.gold -= tax;
        collected += tax;
    });

    city.gold += collected;

    save();

    msg.reply(`💰 تم جمع ${collected.toLocaleString()} دهب ضرائب`);
});


registerCommand('بورصة', async (msg) => {

    const prices = {
        ذهب: Math.floor(Math.random() * 500 + 1000),
        نفط: Math.floor(Math.random() * 1000 + 3000),
        حديد: Math.floor(Math.random() * 300 + 400),
        يورانيوم: Math.floor(Math.random() * 5000 + 10000)
    };

    const embed = new EmbedBuilder()
    .setColor(0x00FF99)
    .setTitle('📊 البورصة العالمية')
    .setDescription(
        Object.entries(prices)
        .map(([n,v]) => `• ${n}: ${v}`)
        .join('\n')
    );

    msg.reply({ embeds: [embed] });
});

registerCommand('راتب', async (msg, args, player) => {

    const city = db.cities[player.cityId];

    const salary = RANKS[player.rank].salary * 10;

    if (city.gold < salary)
        return msg.reply('❌ خزينة المدينة فارغة');

    city.gold -= salary;
    player.gold += salary;

    save();

    msg.reply(`💵 استلمت راتبك: ${salary.toLocaleString()} دهب`);
});

registerCommand('بنك', async (msg, args, player) => {

    if (!db.bank) db.bank = {};

    if (!db.bank[player.id]) {
        db.bank[player.id] = {
            balance: 0
        };
    }

    const account = db.bank[player.id];

    const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('🏦 الحساب البنكي')
    .addFields(
        { name: '💰 الرصيد البنكي', value: account.balance.toLocaleString(), inline: true },
        { name: '👤 الرصيد النقدي', value: player.gold.toLocaleString(), inline: true }
    );

    msg.reply({ embeds: [embed] });

});

registerCommand('بنك-إيداع', async (msg, args, player) => {

    const amount = parseInt(args[0]);

    if (!db.bank[player.id])
        db.bank[player.id] = { balance: 0 };

    if (!amount || amount <= 0)
        return msg.reply('❌ مبلغ غير صحيح');

    if (player.gold < amount)
        return msg.reply('❌ لا تملك هذا المبلغ');

    player.gold -= amount;
    db.bank[player.id].balance += amount;

    save();

    msg.reply(`🏦 تم إيداع ${amount.toLocaleString()} دهب بالبنك`);

});

registerCommand('شركة', async (msg, args, player) => {

    if (!db.companies)
        db.companies = {};

    const name = args.join(' ');

    if (!name)
        return msg.reply('⚠️ !شركة اسم_الشركة');

    if (player.gold < 50000)
        return msg.reply('❌ تحتاج 50,000 دهب');

    player.gold -= 50000;

    db.companies[name] = {
        owner: player.id,
        level: 1,
        employees: [],
        treasury: 50000,
        profit: 0
    };

    save();

    msg.reply(`🏢 تم إنشاء شركة ${name}`);

});

registerCommand('تطوير-شركة', async (msg, args, player) => {

    const name = args.join(' ');

    const company = db.companies?.[name];

    if (!company)
        return msg.reply('❌ الشركة غير موجودة');

    if (company.owner !== player.id)
        return msg.reply('❌ ليست شركتك');

    const cost = company.level * 25000;

    if (player.gold < cost)
        return msg.reply(`❌ تحتاج ${cost}`);

    player.gold -= cost;
    company.level++;

    save();

    msg.reply(`⬆️ تم تطوير الشركة للمستوى ${company.level}`);

});

registerCommand('ميزانية', async (msg, args, player) => {

    const city = db.cities[player.cityId];

    const salaries = calcSalaries(city);
    const upkeep = calcUpkeep(city);

    const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`📊 ميزانية ${city.name}`)
    .addFields(
        { name: '🏦 الخزينة', value: city.gold.toLocaleString(), inline: true },
        { name: '👥 الرواتب', value: salaries.toLocaleString(), inline: true },
        { name: '⚔️ صيانة الجيش', value: upkeep.toLocaleString(), inline: true },
        { name: '💵 صافي الربح', value: (city.gold - salaries - upkeep).toLocaleString(), inline: true }
    );

    msg.reply({ embeds: [embed] });

});

registerCommand('اقتصاد', async (msg, args, player) => {

    const city = db.cities[player.cityId];

    let buildingsIncome = 0;

    buildingsIncome += city.buildings.mine * 500;
    buildingsIncome += city.buildings.farm * 250;
    buildingsIncome += city.buildings.bank * 1000;
    buildingsIncome += city.buildings.ranch * 400;
    buildingsIncome += city.buildings.market * 800 || 0;

    const salaries = calcSalaries(city);
    const army = calcUpkeep(city);

    const net = buildingsIncome - salaries - army;

    const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`📈 اقتصاد ${city.name}`)
    .addFields(
        { name: '💰 الدخل', value: buildingsIncome.toLocaleString(), inline: true },
        { name: '👥 الرواتب', value: salaries.toLocaleString(), inline: true },
        { name: '⚔️ صيانة الجيش', value: army.toLocaleString(), inline: true },
        { name: '📊 صافي الدخل', value: net.toLocaleString(), inline: true }
    );

    msg.reply({ embeds: [embed] });

});

registerCommand('أسهم', async (msg) => {

    if (!db.stocks) {
        db.stocks = {
            نفط: 1000,
            ذهب: 1500,
            حديد: 700,
            تقنية: 2500
        };
    }

    Object.keys(db.stocks).forEach(stock => {
        db.stocks[stock] += Math.floor(Math.random() * 300) - 150;
        if (db.stocks[stock] < 100) db.stocks[stock] = 100;
    });

    save();

    msg.reply(
        `📈 سوق الأسهم\n\n` +
        Object.entries(db.stocks)
        .map(([k,v]) => `• ${k}: ${v}`)
        .join('\n')
    );

});

registerCommand('شراء-سهم', async (msg, args, player) => {

    const stock = args[0];
    const amount = parseInt(args[1]);

    if (!db.stocks?.[stock])
        return msg.reply('❌ السهم غير موجود');

    const cost = db.stocks[stock] * amount;

    if (player.gold < cost)
        return msg.reply('❌ لا تملك المبلغ');

    if (!player.stocks)
        player.stocks = {};

    player.stocks[stock] =
        (player.stocks[stock] || 0) + amount;

    player.gold -= cost;

    save();

    msg.reply(`📈 اشتريت ${amount} سهم من ${stock}`);

});

registerCommand('بيع-سهم', async (msg, args, player) => {

    const stock = args[0];
    const amount = parseInt(args[1]);

    if (!player.stocks?.[stock])
        return msg.reply('❌ لا تملك هذا السهم');

    if (player.stocks[stock] < amount)
        return msg.reply('❌ الكمية غير كافية');

    const reward = db.stocks[stock] * amount;

    player.stocks[stock] -= amount;
    player.gold += reward;

    save();

    msg.reply(`💰 بعت ${amount} سهم وربحت ${reward.toLocaleString()} دهب`);

});

registerCommand('مناورة', async (msg,args,player)=>{

const city = db.cities[player.cityId];
if(!city) return msg.reply('❌ لا تملك مدينة');

const cost = 15000;

if(city.gold < cost)
return msg.reply('❌ ذهب غير كافي');

city.gold -= cost;

city.militaryBoost = {
power: 1.15,
expires: Date.now() + (6 * 60 * 60 * 1000)
};

save();

msg.reply(`🎖️ تمت المناورة العسكرية

⚔️ +15% قوة
⏳ لمدة 6 ساعات
💰 التكلفة: ${cost}`);
});

registerCommand('تدريب', async (msg,args,player)=>{

const city = db.cities[player.cityId];

const cost = 10000;

if(city.gold < cost)
return msg.reply('❌ لا يوجد ذهب كافي');

city.gold -= cost;

for(const unit in city.military){
city.military[unit] =
Math.floor(city.military[unit] * 1.05);
}

gainExp(player,50);

save();

msg.reply(`🏋️ تم تدريب الجيش

📈 فعالية +5%
⭐ خبرة +50`);
});

registerCommand('تجنيد-جماعي', async (msg,args,player)=>{

const city = db.cities[player.cityId];

const amount = parseInt(args[0]);

if(!amount || amount < 1)
return msg.reply('❌ حدد العدد');

const cost = amount * 600;

if(city.gold < cost)
return msg.reply('❌ ذهب غير كافي');

city.gold -= cost;

city.military.soldier += amount;

city.power = calcPower(city);

save();

msg.reply(`🪖 تم تجنيد ${amount}

⚔️ القوة الحالية: ${city.power}`);
});

registerCommand('قاعدة-صواريخ', async (msg,args,player)=>{

const city = db.cities[player.cityId];

if(city.missileBase)
return msg.reply('❌ لديك قاعدة بالفعل');

const cost = 500000;

if(city.gold < cost)
return msg.reply('❌ تحتاج 500,000');

city.gold -= cost;

city.missileBase = {
level:1,
missiles:5
};

save();

msg.reply(`🚀 تم إنشاء قاعدة صواريخ

📍 المستوى 1
🚀 الصواريخ 5`);
});

registerCommand('حاملة-طائرات', async (msg,args,player)=>{

const city = db.cities[player.cityId];

const cost = 1200000;

if(city.gold < cost)
return msg.reply('❌ ذهب غير كافي');

city.gold -= cost;

if(!city.carriers)
city.carriers = 0;

city.carriers++;

city.power += 15000;

save();

msg.reply(`🛳️ تم تصنيع حاملة طائرات

⚔️ +15000 قوة`);
});

registerCommand('غواصة', async (msg,args,player)=>{

const city = db.cities[player.cityId];

const cost = 450000;

if(city.gold < cost)
return msg.reply('❌ ذهب غير كافي');

city.gold -= cost;

if(!city.submarines)
city.submarines = 0;

city.submarines++;

city.power += 7000;

save();

msg.reply(`🌊 تم تصنيع غواصة حربية

⚔️ +7000 قوة`);
});

registerCommand('درع-نووي', async (msg,args,player)=>{

const city = db.cities[player.cityId];

const cost = 900000;

if(city.gold < cost)
return msg.reply('❌ ذهب غير كافي');

city.gold -= cost;

city.nuclearShield = true;
city.nuclearShieldUntil =
Date.now() + (48 * 60 * 60 * 1000);

save();

msg.reply(`☢️ تم تفعيل الدرع النووي

⏳ 48 ساعة حماية`);
});

registerCommand('تجسس', async (msg,args,player)=>{

const targetName = args.join(' ');

const target =
Object.values(db.cities)
.find(c=>c.name===targetName);

if(!target)
return msg.reply('❌ المدينة غير موجودة');

const success = Math.random() < 0.7;

if(!success)
return msg.reply('🕵️ تم كشف الجاسوس');

msg.reply(`🕵️ تقرير استخباراتي

🏙️ ${target.name}
💰 ${target.gold}
👥 ${target.citizens.length}
⚔️ ${calcPower(target)}
🏆 ${target.level}`);
});

registerCommand('حصار', async (msg,args,player)=>{

const city = db.cities[player.cityId];

const targetName = args.join(' ');

const target =
Object.values(db.cities)
.find(c=>c.name===targetName);

if(!target)
return msg.reply('❌ المدينة غير موجودة');

if(calcPower(city) < calcPower(target))
return msg.reply('❌ جيشك أضعف');

target.isBlockaded = true;
target.blockadeUntil =
Date.now() + (24*60*60*1000);

save();

msg.reply(`🚧 تم حصار ${target.name}

⛔ التجارة متوقفة 24 ساعة`);
});

registerCommand('احتلال', async (msg,args,player)=>{

const city = db.cities[player.cityId];

const targetName = args.join(' ');

const target =
Object.values(db.cities)
.find(c=>c.name===targetName);

if(!target)
return msg.reply('❌ المدينة غير موجودة');

const attack = calcPower(city);
const defend = calcPower(target);

if(attack < defend * 1.5)
return msg.reply('❌ تحتاج قوة أكبر بـ50%');

const reward =
Math.floor(target.gold * 0.40);

city.gold += reward;
target.gold -= reward;

target.owner = msg.author.id;

city.victories =
(city.victories||0)+1;

save();

msg.reply(`🏴 تم احتلال ${target.name}

💰 غنائم: ${reward}

👑 أصبحت المدينة تحت حكمك`);
});

// ===== مطار حربي =====

registerCommand('مطار', async (msg,args,player)=>{

const city = db.cities[player.cityId];

const cost = 800000;

if(city.gold < cost)
return msg.reply('❌ ذهب غير كافي');

city.gold -= cost;

city.airport = {
fighters: 0,
bombers: 0,
level: 1
};

save();

msg.reply('✈️ تم إنشاء مطار حربي');
});

// ===== تصنيع مقاتلات =====

registerCommand('مقاتلة', async (msg,args,player)=>{

const city = db.cities[player.cityId];

if(!city.airport)
return msg.reply('❌ لا يوجد مطار');

const cost = 120000;

if(city.gold < cost)
return msg.reply('❌ ذهب غير كافي');

city.gold -= cost;

city.airport.fighters++;

save();

msg.reply('✈️ تم تصنيع مقاتلة جديدة');
});

// ===== قاذفة =====

registerCommand('قاذفة', async (msg,args,player)=>{

const city = db.cities[player.cityId];

if(!city.airport)
return msg.reply('❌ لا يوجد مطار');

const cost = 350000;

if(city.gold < cost)
return msg.reply('❌ ذهب غير كافي');

city.gold -= cost;

city.airport.bombers++;

save();

msg.reply('💣 تم تصنيع قاذفة استراتيجية');
});

// ===== وقود =====

registerCommand('شراء-وقود', async (msg,args,player)=>{

const city = db.cities[player.cityId];

const amount = parseInt(args[0]);

if(!amount)
return msg.reply('❌ حدد الكمية');

const cost = amount * 100;

if(city.gold < cost)
return msg.reply('❌ ذهب غير كافي');

city.gold -= cost;

city.fuel = (city.fuel || 0) + amount;

save();

msg.reply(`⛽ تم شراء ${amount} وقود`);
});

// ===== ذخيرة =====

registerCommand('شراء-ذخيرة', async (msg,args,player)=>{

const city = db.cities[player.cityId];

const amount = parseInt(args[0]);

if(!amount)
return msg.reply('❌ حدد الكمية');

const cost = amount * 50;

if(city.gold < cost)
return msg.reply('❌ ذهب غير كافي');

city.gold -= cost;

city.ammo = (city.ammo || 0) + amount;

save();

msg.reply(`🔫 تم شراء ${amount} ذخيرة`);
});

// ===== إطلاق صاروخ =====

registerCommand('اطلاق-صاروخ', async (msg,args,player)=>{

const city = db.cities[player.cityId];

const targetName = args.join(' ');

const target =
Object.values(db.cities)
.find(c=>c.name===targetName);

if(!target)
return msg.reply('❌ المدينة غير موجودة');

if(!city.missileBase)
return msg.reply('❌ لا يوجد قاعدة صواريخ');

if(city.missileBase.missiles < 1)
return msg.reply('❌ لا توجد صواريخ');

city.missileBase.missiles--;

const damage =
Math.floor(target.gold * 0.15);

target.gold -= damage;

save();

msg.reply(`🚀 تم ضرب ${target.name}

💥 خسائر: ${damage}`);
});

// ===== تمرد =====

registerCommand('تمرد', async (msg,args,player)=>{

const city = db.cities[player.cityId];

const chance = Math.random();

if(chance > 0.3)
return msg.reply('❌ فشل التمرد');

city.owner = msg.author.id;

save();

msg.reply('🏴 نجح التمرد وتم الاستيلاء على المدينة');
});

// ===== استخبارات =====

registerCommand('استخبارات', async (msg,args,player)=>{

const city = db.cities[player.cityId];

if(!city.intelligence)
city.intelligence = 1;

city.intelligence++;

save();

msg.reply(`🕵️ مستوى الاستخبارات: ${city.intelligence}`);
});

// ===== مصنع أسلحة =====

registerCommand('مصنع-اسلحة', async (msg,args,player)=>{

const city = db.cities[player.cityId];

const cost = 1500000;

if(city.gold < cost)
return msg.reply('❌ ذهب غير كافي');

city.gold -= cost;

city.weaponFactory = true;

save();

msg.reply('🏭 تم إنشاء مصنع أسلحة');
});

// ===== إنتاج سلاح =====

registerCommand('انتاج-اسلحة', async (msg,args,player)=>{

const city = db.cities[player.cityId];

if(!city.weaponFactory)
return msg.reply('❌ لا يوجد مصنع');

city.ammo = (city.ammo || 0) + 1000;

save();

msg.reply('🔫 تم إنتاج 1000 ذخيرة');
});

// =========================
// نظام التحالفات المتطور
// =========================

// إنشاء تحالف
registerCommand('انشاء-تحالف', async (msg,args,player)=>{

if(!db.alliances) db.alliances = {};

const name = args.join(' ');

if(!name)
return msg.reply('❌ حدد اسم التحالف');

if(db.alliances[name])
return msg.reply('❌ التحالف موجود');

db.alliances[name] = {
name,
leader: msg.author.id,
members: [msg.author.id],
level: 1,
xp: 0,
treasury: 0,
wins: 0
};

save();

msg.reply(`🤝 تم إنشاء التحالف ${name}`);

});

// =========================
// دعوة تحالف
// =========================

registerCommand('دعوة-تحالف', async (msg,args,player)=>{

const target = msg.mentions.users.first();

if(!target)
return msg.reply('❌ قم بمنشن اللاعب');

const alliance = Object.values(db.alliances)
.find(a=>a.leader===msg.author.id);

if(!alliance)
return msg.reply('❌ أنت لست قائد تحالف');

if(alliance.members.includes(target.id))
return msg.reply('❌ اللاعب موجود');

alliance.members.push(target.id);

save();

msg.reply(`📨 تمت إضافة ${target} للتحالف`);

});

// =========================
// انسحاب من تحالف
// =========================

registerCommand('انسحاب-تحالف', async (msg,args,player)=>{

const alliance = Object.values(db.alliances)
.find(a=>a.members.includes(msg.author.id));

if(!alliance)
return msg.reply('❌ لست داخل تحالف');

alliance.members =
alliance.members.filter(id=>id!==msg.author.id);

save();

msg.reply('🚪 تم الانسحاب من التحالف');

});

// =========================
// صندوق التحالف
// =========================

registerCommand('صندوق-تحالف', async (msg,args,player)=>{

const amount = parseInt(args[0]);

if(!amount || amount <= 0)
return msg.reply('❌ مبلغ غير صحيح');

if(player.gold < amount)
return msg.reply('❌ لا تملك المبلغ');

const alliance = Object.values(db.alliances)
.find(a=>a.members.includes(msg.author.id));

if(!alliance)
return msg.reply('❌ لست داخل تحالف');

player.gold -= amount;
alliance.treasury += amount;

save();

msg.reply(`🏦 تم إيداع ${amount} في صندوق التحالف`);

});

// =========================
// ترقية تحالف
// =========================

registerCommand('ترقية-تحالف', async (msg,args,player)=>{

const alliance = Object.values(db.alliances)
.find(a=>a.leader===msg.author.id);

if(!alliance)
return msg.reply('❌ أنت لست القائد');

const cost = alliance.level * 500000;

if(alliance.treasury < cost)
return msg.reply(`❌ تحتاج ${cost}`);

alliance.treasury -= cost;
alliance.level++;

save();

msg.reply(`⬆️ تمت ترقية التحالف للمستوى ${alliance.level}`);

});

// =========================
// معلومات التحالف
// =========================

registerCommand('تحالف', async (msg,args,player)=>{

const alliance = Object.values(db.alliances)
.find(a=>a.members.includes(msg.author.id));

if(!alliance)
return msg.reply('❌ لست داخل تحالف');

msg.reply(`
🤝 التحالف: ${alliance.name}

👑 القائد: <@${alliance.leader}>
👥 الأعضاء: ${alliance.members.length}
🏆 المستوى: ${alliance.level}
💰 الخزينة: ${alliance.treasury}
⚔️ الانتصارات: ${alliance.wins}
`);

});

// =========================
// حرب تحالفات
// =========================

registerCommand('حرب-تحالفات', async (msg,args,player)=>{

const targetName = args.join(' ');

const attacker = Object.values(db.alliances)
.find(a=>a.members.includes(msg.author.id));

const defender = db.alliances[targetName];

if(!attacker)
return msg.reply('❌ لست داخل تحالف');

if(!defender)
return msg.reply('❌ التحالف المستهدف غير موجود');

const atkPower =
attacker.members.length *
(attacker.level * 1000);

const defPower =
defender.members.length *
(defender.level * 1000);

const winner =
atkPower > defPower
? attacker
: defender;

winner.wins++;

const reward = 100000;

winner.treasury += reward;

save();

msg.reply(`
⚔️ حرب تحالفات

🟥 ${attacker.name}: ${atkPower}
🟦 ${defender.name}: ${defPower}

🏆 الفائز: ${winner.name}

💰 الجائزة: ${reward}
`);

});

// =========================
// سحب من صندوق التحالف
// =========================

registerCommand('سحب-تحالف', async (msg,args,player)=>{

const alliance = Object.values(db.alliances)
.find(a=>a.leader===msg.author.id);

if(!alliance)
return msg.reply('❌ أنت لست القائد');

const amount = parseInt(args[0]);

if(!amount || amount <= 0)
return msg.reply('❌ مبلغ غير صحيح');

if(alliance.treasury < amount)
return msg.reply('❌ الصندوق لا يكفي');

alliance.treasury -= amount;
player.gold += amount;

save();

msg.reply(`💸 تم سحب ${amount} من صندوق التحالف`);

});

// =========================
// قائمة التحالفات
// =========================

registerCommand('التحالفات', async (msg)=>{

if(!db.alliances)
return msg.reply('❌ لا توجد تحالفات');

const list =
Object.values(db.alliances)
.sort((a,b)=>b.level-a.level)
.slice(0,10)
.map((a,i)=>
`${i+1}. ${a.name} | Lv.${a.level} | 👥 ${a.members.length}`
).join('\n');

msg.reply(`
🏆 أفضل التحالفات

${list}
`);

});



// ════════════ EVENTS ════════════

client.once('ready', () => {
    console.log(`✅ البوت ${client.user.tag} اشتغل بنجاح`);
    console.log(`📊 سيرفرات: ${client.guilds.cache.size}`);
    client.user.setActivity('⚔️ حرب الممالك | !مساعدة');
});



client.on('error', (err) => {
    console.error('❌ خطأ البوت:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ رفض غير معالج:', err);
});



// ════════════ LOGIN - آخر حاجة في الملف ════════════
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ DISCORD_TOKEN غير موجود في .env');
    process.exit(1);
}

client.login(token).catch(err => {
    console.error('❌ فشل تسجيل الدخول:', err);
    process.exit(1);
});
