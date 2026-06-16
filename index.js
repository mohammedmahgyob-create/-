// ====================================================
// بوت الاقتصاد العربي الكامل - discord.js v14
// ====================================================
// التثبيت: npm install discord.js @napi-rs/canvas
// التشغيل: node index.js
// ====================================================

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const PREFIX = "$";
const DB_FILE = "./economy.json";
const CURRENCY = "💰 دينار";

// ====================================================
// قاعدة البيانات (ملف JSON)
// ====================================================
function loadDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
function getUser(db, id) {
  if (!db[id]) {
    db[id] = {
      wallet: 0, bank: 0, debt: 0, xp: 0, level: 1,
      clan: null, wins: 0, losses: 0,
      lastDaily: 0, lastWork: 0, lastCrime: 0,
      items: [], transactions: []
    };
  }
  return db[id];
}
function addXP(db, id, amount) {
  const u = getUser(db, id);
  u.xp += amount;
  const newLevel = Math.floor(u.xp / 200) + 1;
  if (newLevel > u.level) {
    u.level = newLevel;
    return true; // level up
  }
  return false;
}
function formatNum(n) {
  return Number(n).toLocaleString("ar-EG");
}
function cooldownLeft(last, seconds) {
  const diff = Math.floor((Date.now() - last) / 1000);
  return diff < seconds ? seconds - diff : 0;
}
function fmtTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}س ${m}د`;
  if (m > 0) return `${m}د ${sec}ث`;
  return `${sec}ث`;
}

// ====================================================
// الأوامر
// ====================================================
const commands = {

  // ─── رصيد ───
  async رصيد(msg, args) {
    const db = loadDB();
    const target = msg.mentions.users.first() || msg.author;
    const u = getUser(db, target.id);
    const total = u.wallet + u.bank;
    const embed = new EmbedBuilder()
      .setColor("#f5a623")
      .setTitle(`💼 محفظة ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: "💰 المحفظة", value: `${formatNum(u.wallet)} دينار`, inline: true },
        { name: "🏦 البنك", value: `${formatNum(u.bank)} دينار`, inline: true },
        { name: "💳 الديون", value: `${formatNum(u.debt)} دينار`, inline: true },
        { name: "📊 الإجمالي", value: `**${formatNum(total)} دينار**`, inline: true },
        { name: "⭐ المستوى", value: `${u.level} (${u.xp} XP)`, inline: true },
        { name: "🏰 العشيرة", value: u.clan || "بدون عشيرة", inline: true }
      )
      .setFooter({ text: `🏆 انتصارات: ${u.wins} | هزائم: ${u.losses}` });
    return msg.reply({ embeds: [embed] });
  },

  // ─── يومي ───
  async يومي(msg) {
    const db = loadDB();
    const u = getUser(db, msg.author.id);
    const cd = cooldownLeft(u.lastDaily, 86400);
    if (cd > 0) {
      return msg.reply(`⏳ **كول داون يومي!** انتظر: \`${fmtTime(cd)}\``);
    }
    const bonus = u.items?.includes("عصا الملك") ? 1.25 : 1;
    const amount = Math.floor((Math.random() * 400 + 100) * bonus);
    u.wallet += amount;
    u.lastDaily = Date.now();
    const lvlUp = addXP(db, msg.author.id, 30);
    saveDB(db);
    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🎁 المكافأة اليومية!")
      .setDescription(`حصلت على **${formatNum(amount)} ${CURRENCY}**\n💰 رصيدك الآن: **${formatNum(u.wallet)}**`)
      .setFooter({ text: lvlUp ? `🎉 ترقيت إلى المستوى ${u.level}!` : "+30 XP" });
    return msg.reply({ embeds: [embed] });
  },

  // ─── عمل ───
  async عمل(msg) {
    const db = loadDB();
    const u = getUser(db, msg.author.id);
    const cd = cooldownLeft(u.lastWork, 1800);
    if (cd > 0) return msg.reply(`⏳ **تعبت من الشغل!** استرح: \`${fmtTime(cd)}\``);
    const jobs = [
      { job: "عامل بناء 👷", min: 80, max: 180 },
      { job: "سائق توصيل 🚗", min: 60, max: 150 },
      { job: "تاجر سوق 🛒", min: 100, max: 220 },
      { job: "مبرمج 💻", min: 150, max: 300 },
      { job: "صياد 🎣", min: 40, max: 120 },
      { job: "طباخ 👨‍🍳", min: 70, max: 160 },
    ];
    const chosen = jobs[Math.floor(Math.random() * jobs.length)];
    const amount = Math.floor(Math.random() * (chosen.max - chosen.min) + chosen.min);
    u.wallet += amount;
    u.lastWork = Date.now();
    addXP(db, msg.author.id, 15);
    saveDB(db);
    return msg.reply({
      embeds: [new EmbedBuilder().setColor("#3b82f6")
        .setTitle(`💼 ${chosen.job}`)
        .setDescription(`عملت بجد وكسبت **${formatNum(amount)} ${CURRENCY}**\n💰 رصيدك: **${formatNum(u.wallet)}**`)
        .setFooter({ text: "+15 XP | كول داون: 30 دقيقة" })]
    });
  },

  // ─── جريمة ───
  async جريمة(msg) {
    const db = loadDB();
    const u = getUser(db, msg.author.id);
    const cd = cooldownLeft(u.lastCrime, 3600);
    if (cd > 0) return msg.reply(`⏳ **الشرطة تراقبك!** انتظر: \`${fmtTime(cd)}\``);
    const crimes = ["سرقة متجر 🏪", "اختراق بنك 💻", "تهريب بضائع 📦", "سرقة سيارة 🚗", "نشل محفظة 👛"];
    const crime = crimes[Math.floor(Math.random() * crimes.length)];
    u.lastCrime = Date.now();
    if (Math.random() > 0.45) {
      const gain = Math.floor(Math.random() * 800 + 200);
      u.wallet += gain;
      addXP(db, msg.author.id, 25);
      saveDB(db);
      return msg.reply({
        embeds: [new EmbedBuilder().setColor("#a855f7")
          .setTitle(`🦹 ${crime} - نجحت!`)
          .setDescription(`نجحت في الجريمة وربحت **${formatNum(gain)} ${CURRENCY}**\n💰 رصيدك: **${formatNum(u.wallet)}**`)]
      });
    } else {
      const fine = Math.floor(Math.random() * 300 + 100);
      u.wallet = Math.max(0, u.wallet - fine);
      saveDB(db);
      return msg.reply({
        embeds: [new EmbedBuilder().setColor("#ef4444")
          .setTitle(`👮 ${crime} - القبض عليك!`)
          .setDescription(`انقبضت ودفعت غرامة **${formatNum(fine)} ${CURRENCY}**\n💰 رصيدك: **${formatNum(u.wallet)}**`)]
      });
    }
  },

  // ─── تحويل ───
  async تحويل(msg, args) {
    const db = loadDB();
    const target = msg.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!target) return msg.reply("❌ اذكر المستخدم: `$تحويل @مستخدم مبلغ`");
    if (!amount || amount <= 0) return msg.reply("❌ اكتب مبلغاً صحيحاً");
    if (target.id === msg.author.id) return msg.reply("❌ لا تقدر تحول لنفسك");
    const sender = getUser(db, msg.author.id);
    if (sender.wallet < amount) return msg.reply(`❌ رصيدك غير كافٍ! عندك **${formatNum(sender.wallet)}**`);
    const tax = Math.floor(amount * 0.05);
    const net = amount - tax;
    sender.wallet -= amount;
    const receiver = getUser(db, target.id);
    receiver.wallet += net;
    const tx = { from: msg.author.username, to: target.username, amount, tax, type: "تحويل", time: new Date().toISOString() };
    if (!sender.transactions) sender.transactions = [];
    sender.transactions.unshift(tx);
    if (sender.transactions.length > 20) sender.transactions.pop();
    saveDB(db);
    return msg.reply({
      embeds: [new EmbedBuilder().setColor("#22c55e")
        .setTitle("💸 تم التحويل بنجاح!")
        .addFields(
          { name: "📤 المُرسِل", value: msg.author.username, inline: true },
          { name: "📥 المستقبِل", value: target.username, inline: true },
          { name: "💰 المبلغ", value: `${formatNum(amount)} دينار`, inline: true },
          { name: "🏛️ الضريبة (5%)", value: `${formatNum(tax)} دينار`, inline: true },
          { name: "✅ الصافي", value: `**${formatNum(net)} دينار**`, inline: true }
        )]
    });
  },

  // ─── بنك ───
  async بنك(msg, args) {
    const db = loadDB();
    const u = getUser(db, msg.author.id);
    const action = args[0];
    const amount = parseInt(args[1]);
    if (action === "إيداع" || action === "ايداع") {
      if (!amount || amount <= 0) return msg.reply("❌ `$بنك إيداع مبلغ`");
      if (u.wallet < amount) return msg.reply(`❌ محفظتك: **${formatNum(u.wallet)}** فقط`);
      u.wallet -= amount;
      u.bank += amount;
      saveDB(db);
      return msg.reply({ embeds: [new EmbedBuilder().setColor("#3b82f6").setTitle("🏦 تم الإيداع").setDescription(`أودعت **${formatNum(amount)} ${CURRENCY}**\n🏦 البنك: **${formatNum(u.bank)}** | 💰 المحفظة: **${formatNum(u.wallet)}**`)] });
    } else if (action === "سحب") {
      if (!amount || amount <= 0) return msg.reply("❌ `$بنك سحب مبلغ`");
      if (u.bank < amount) return msg.reply(`❌ بنكك: **${formatNum(u.bank)}** فقط`);
      u.bank -= amount;
      u.wallet += amount;
      saveDB(db);
      return msg.reply({ embeds: [new EmbedBuilder().setColor("#f5a623").setTitle("🏧 تم السحب").setDescription(`سحبت **${formatNum(amount)} ${CURRENCY}**\n💰 المحفظة: **${formatNum(u.wallet)}** | 🏦 البنك: **${formatNum(u.bank)}**`)] });
    } else if (action === "معلومات" || !action) {
      return msg.reply({ embeds: [new EmbedBuilder().setColor("#3b82f6").setTitle("🏦 حسابك البنكي").addFields({ name: "💰 المحفظة", value: `${formatNum(u.wallet)}`, inline: true }, { name: "🏦 البنك", value: `${formatNum(u.bank)}`, inline: true }, { name: "💳 ديون", value: `${formatNum(u.debt)}`, inline: true }).setFooter({ text: "فائدة بنكية: 2% كل 24 ساعة" })] });
    }
  },

  // ─── قرض ───
  async قرض(msg, args) {
    const db = loadDB();
    const u = getUser(db, msg.author.id);
    const amount = parseInt(args[0]);
    if (!amount || amount <= 0) return msg.reply("❌ `$قرض مبلغ`");
    if (u.debt > 0) return msg.reply(`❌ عندك ديون قائمة: **${formatNum(u.debt)}** دينار. سدّدها أولاً بـ \`$سداد\``);
    if (amount > 10000) return msg.reply("❌ الحد الأقصى للقرض 10,000 دينار");
    const interest = Math.floor(amount * 0.1);
    u.wallet += amount;
    u.debt = amount + interest;
    saveDB(db);
    return msg.reply({ embeds: [new EmbedBuilder().setColor("#ef4444").setTitle("🏦 تم منح القرض").addFields({ name: "💰 مبلغ القرض", value: `${formatNum(amount)} دينار`, inline: true }, { name: "📈 الفائدة (10%)", value: `${formatNum(interest)} دينار`, inline: true }, { name: "💳 إجمالي الديون", value: `**${formatNum(u.debt)} دينار**`, inline: true }).setFooter({ text: "سدّد قرضك بـ $سداد" })] });
  },

  // ─── سداد ───
  async سداد(msg) {
    const db = loadDB();
    const u = getUser(db, msg.author.id);
    if (u.debt <= 0) return msg.reply("✅ ليس عليك أي ديون!");
    if (u.wallet < u.debt) return msg.reply(`❌ رصيدك **${formatNum(u.wallet)}** غير كافٍ. الدين: **${formatNum(u.debt)}**`);
    u.wallet -= u.debt;
    const paid = u.debt;
    u.debt = 0;
    saveDB(db);
    return msg.reply({ embeds: [new EmbedBuilder().setColor("#22c55e").setTitle("✅ تم سداد الدين").setDescription(`دفعت **${formatNum(paid)} ${CURRENCY}** وأصبحت خالياً من الديون! 🎉`)] });
  },

  // ─── بلاك_جاك ───
  async "بلاك_جاك"(msg, args) {
    const db = loadDB();
    const u = getUser(db, msg.author.id);
    const bet = parseInt(args[0]);
    if (!bet || bet <= 0) return msg.reply("❌ `$بلاك_جاك مبلغ`");
    if (u.wallet < bet) return msg.reply(`❌ رصيدك: **${formatNum(u.wallet)}** فقط`);
    const cards = ["A♠", "K♥", "Q♦", "J♣", "10♠", "9♥", "8♦", "7♣", "6♠", "5♥", "4♦", "3♣", "2♠"];
    const val = (c) => { if (["K","Q","J"].some(f => c.startsWith(f))) return 10; if (c.startsWith("A")) return 11; return parseInt(c); };
    const deal = () => { const c = cards[Math.floor(Math.random() * cards.length)]; return c; };
    let player = [deal(), deal()], dealer = [deal(), deal()];
    const sum = (hand) => { let s = hand.reduce((a, c) => a + val(c), 0); if (s > 21) { hand.forEach(c => { if (c.startsWith("A")) s -= 10; }); } return s; };
    const ps = sum(player), ds = sum(dealer);
    let result, color;
    const jackBonus = u.items?.includes("خاتم الحظ") ? 1.15 : 1;
    if (ps === 21 || (ps <= 21 && (ps > ds || ds > 21))) {
      const win = Math.floor(bet * jackBonus);
      u.wallet += win; u.wins++;
      result = `🎉 **فزت!** +${formatNum(win)} دينار`; color = "#22c55e";
    } else {
      u.wallet -= bet; u.losses++;
      result = `😢 **خسرت!** -${formatNum(bet)} دينار`; color = "#ef4444";
    }
    addXP(db, msg.author.id, 10);
    saveDB(db);
    return msg.reply({ embeds: [new EmbedBuilder().setColor(color).setTitle("🃏 بلاك جاك").addFields({ name: "🃏 ورقك", value: `${player.join(" ")} = **${ps}**`, inline: true }, { name: "🏦 الكازينو", value: `${dealer.join(" ")} = **${ds}**`, inline: true }).setDescription(result).setFooter({ text: `💰 رصيدك: ${formatNum(u.wallet)} دينار` })] });
  },

  // ─── نرد ───
  async نرد(msg, args) {
    const db = loadDB();
    const u = getUser(db, msg.author.id);
    const bet = parseInt(args[0]);
    if (!bet || bet <= 0) return msg.reply("❌ `$نرد مبلغ`");
    if (u.wallet < bet) return msg.reply(`❌ رصيدك غير كافٍ`);
    const p = Math.floor(Math.random() * 6) + 1;
    const d = Math.floor(Math.random() * 6) + 1;
    if (p > d) {
      u.wallet += bet; u.wins++;
      return msg.reply({ embeds: [new EmbedBuilder().setColor("#22c55e").setTitle("🎲 النرد - فزت!").setDescription(`أنت: **${p}** 🆚 البوت: **${d}**\n+${formatNum(bet)} دينار | 💰 ${formatNum(u.wallet)}`)] });
    } else if (p < d) {
      u.wallet -= bet; u.losses++;
      saveDB(db);
      return msg.reply({ embeds: [new EmbedBuilder().setColor("#ef4444").setTitle("🎲 النرد - خسرت!").setDescription(`أنت: **${p}** 🆚 البوت: **${d}**\n-${formatNum(bet)} دينار | 💰 ${formatNum(u.wallet)}`)] });
    } else {
      saveDB(db);
      return msg.reply({ embeds: [new EmbedBuilder().setColor("#f5a623").setTitle("🎲 النرد - تعادل!").setDescription(`أنت: **${p}** 🆚 البوت: **${d}**\nتعادل، مفيش حاجة اتغيرت`)] });
    }
  },

  // ─── روليت ───
  async روليت(msg, args) {
    const db = loadDB();
    const u = getUser(db, msg.author.id);
    const bet = parseInt(args[0]);
    const choice = args[1];
    if (!bet || !choice) return msg.reply("❌ `$روليت مبلغ أحمر/أسود/رقم(1-36)`");
    if (u.wallet < bet) return msg.reply(`❌ رصيدك غير كافٍ`);
    const spin = Math.floor(Math.random() * 37);
    const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(spin);
    const color = spin === 0 ? "🟢 أخضر" : isRed ? "🔴 أحمر" : "⚫ أسود";
    let won = false, mult = 1;
    if (choice === "أحمر" && isRed && spin !== 0) { won = true; mult = 2; }
    else if (choice === "أسود" && !isRed && spin !== 0) { won = true; mult = 2; }
    else if (parseInt(choice) === spin) { won = true; mult = 36; }
    const luckBonus = u.items?.includes("خاتم الحظ") ? 1.15 : 1;
    if (won) {
      const win = Math.floor(bet * mult * luckBonus);
      u.wallet += win; u.wins++;
      saveDB(db);
      return msg.reply({ embeds: [new EmbedBuilder().setColor("#22c55e").setTitle("🎡 روليت - فزت!").setDescription(`الرقم: **${spin}** ${color}\nاخترت: **${choice}** ✅\n🎉 +${formatNum(win)} دينار (×${mult})`)] });
    } else {
      u.wallet -= bet; u.losses++;
      saveDB(db);
      return msg.reply({ embeds: [new EmbedBuilder().setColor("#ef4444").setTitle("🎡 روليت - خسرت!").setDescription(`الرقم: **${spin}** ${color}\nاخترت: **${choice}** ❌\n-${formatNum(bet)} دينار`)] });
    }
  },

  // ─── غارة ───
  async غارة(msg, args) {
    const db = loadDB();
    const target = msg.mentions.users.first();
    if (!target) return msg.reply("❌ `$غارة @مستخدم`");
    if (target.id === msg.author.id) return msg.reply("❌ لا تقدر تغير نفسك");
    const attacker = getUser(db, msg.author.id);
    const defender = getUser(db, target.id);
    if (defender.wallet < 50) return msg.reply(`❌ ${target.username} فقير، مفيش فايدة من الغارة 😂`);
    const hasShield = defender.items?.includes("درع الأسطورة");
    const successRate = hasShield ? 0.35 : 0.5;
    if (Math.random() < successRate) {
      const steal = Math.floor(defender.wallet * (Math.random() * 0.2 + 0.05));
      attacker.wallet += steal;
      defender.wallet -= steal;
      attacker.wins++;
      defender.losses++;
      saveDB(db);
      return msg.reply({ embeds: [new EmbedBuilder().setColor("#a855f7").setTitle(`⚔️ غارة ناجحة على ${target.username}!`).setDescription(`سرقت **${formatNum(steal)} ${CURRENCY}** 💰\n${hasShield ? "⚠️ درع الأسطورة قلّل الخسارة!" : ""}`)] });
    } else {
      const fine = Math.floor(attacker.wallet * 0.1);
      attacker.wallet = Math.max(0, attacker.wallet - fine);
      attacker.losses++;
      saveDB(db);
      return msg.reply({ embeds: [new EmbedBuilder().setColor("#ef4444").setTitle(`🛡️ فشلت الغارة على ${target.username}!`).setDescription(`${target.username} صدّك ودفعت غرامة **${formatNum(fine)} ${CURRENCY}**`)] });
    }
  },

  // ─── حرب ───
  async حرب(msg, args) {
    const db = loadDB();
    const attacker = getUser(db, msg.author.id);
    const targetUser = msg.mentions.users.first();
    if (!targetUser) return msg.reply("❌ `$حرب @مستخدم`");
    const defender = getUser(db, targetUser.id);
    const aPower = (attacker.level * 10) + (attacker.wins * 2) + (attacker.items?.includes("سيف الذهب") ? 15 : 0) + (attacker.items?.includes("حصان الحرب") ? 20 : 0) + Math.floor(Math.random() * 30);
    const dPower = (defender.level * 10) + (defender.wins * 2) + (defender.items?.includes("درع الأسطورة") ? 20 : 0) + Math.floor(Math.random() * 30);
    const prize = Math.floor(Math.min(defender.wallet, defender.bank) * 0.15);
    if (aPower > dPower) {
      attacker.wallet += prize;
      defender.wallet = Math.max(0, defender.wallet - prize);
      attacker.wins++; defender.losses++;
      addXP(db, msg.author.id, 50);
      saveDB(db);
      return msg.reply({ embeds: [new EmbedBuilder().setColor("#f5a623").setTitle(`⚔️ نتيجة الحرب`).setDescription(`**${msg.author.username}** انتصر على **${targetUser.username}**! 🏆\nقوة الهجوم: ${aPower} 🆚 قوة الدفاع: ${dPower}\n💰 الغنيمة: **${formatNum(prize)} دينار**`)] });
    } else {
      defender.wallet += Math.floor(prize * 0.5);
      attacker.losses++; defender.wins++;
      saveDB(db);
      return msg.reply({ embeds: [new EmbedBuilder().setColor("#ef4444").setTitle(`⚔️ نتيجة الحرب`).setDescription(`**${targetUser.username}** دافع وانتصر! 🛡️\nقوة الهجوم: ${aPower} 🆚 قوة الدفاع: ${dPower}\n😢 **${msg.author.username}** خسر!`)] });
    }
  },

  // ─── متجر ───
  async متجر(msg) {
    const SHOP = [
      { id: 1, name: "سيف الذهب", price: 500, emoji: "⚔️", bonus: "+10% ربح في الحروب" },
      { id: 2, name: "درع الأسطورة", price: 1200, emoji: "🛡️", bonus: "-20% خسارة في الغارات" },
      { id: 3, name: "عصا الملك", price: 3000, emoji: "🪄", bonus: "+25% ربح يومي" },
      { id: 4, name: "خاتم الحظ", price: 800, emoji: "💍", bonus: "+15% نسبة الفوز" },
      { id: 5, name: "حصان الحرب", price: 2000, emoji: "🐎", bonus: "+30% قوة في الحروب" },
    ];
    const embed = new EmbedBuilder().setColor("#f5a623").setTitle("🛒 متجر المملكة");
    SHOP.forEach(item => {
      embed.addFields({ name: `${item.emoji} ${item.name}`, value: `💰 ${formatNum(item.price)} دينار\n📌 ${item.bonus}`, inline: true });
    });
    embed.setFooter({ text: "للشراء: $شراء اسم_العنصر" });
    return msg.reply({ embeds: [embed] });
  },

  // ─── شراء ───
  async شراء(msg, args) {
    const SHOP = [
      { name: "سيف الذهب", price: 500, emoji: "⚔️" },
      { name: "درع الأسطورة", price: 1200, emoji: "🛡️" },
      { name: "عصا الملك", price: 3000, emoji: "🪄" },
      { name: "خاتم الحظ", price: 800, emoji: "💍" },
      { name: "حصان الحرب", price: 2000, emoji: "🐎" },
    ];
    const itemName = args.join(" ");
    const item = SHOP.find(i => i.name === itemName);
    if (!item) return msg.reply(`❌ العنصر غير موجود. جرب \`$متجر\``);
    const db = loadDB();
    const u = getUser(db, msg.author.id);
    if (u.items?.includes(item.name)) return msg.reply("❌ عندك هذا العنصر بالفعل!");
    if 
