const Discord   = require('discord.js');
const client    = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
    ]
});
const config    = require('./config.json');
const moment    = require('moment-timezone');
const sqlite3   = require('sqlite3').verbose();
require('dotenv/config');

let db = new sqlite3.Database('./data/database.db', (err) => {
    if (err) return console.error(err.message);
    console.log('== [OK] Connected to DB!');

    let sql = `CREATE TABLE IF NOT EXISTS "trn_train" (
                    "train_id"	INTEGER NOT NULL,
                    "user_id"	INTEGER NOT NULL,
                    "user_name"	INTEGER NOT NULL,
                    "expansion_id"	INTEGER NOT NULL,
                    "description"	TEXT,
                    "date_end"	TIMESTAMP NOT NULL,
                    CONSTRAINT "train_id" PRIMARY KEY("train_id")
                )`;

    db.exec(sql, function(err){
        if (err) return console.log(err)
        console.log('== [OK] The main table was created!');
    });
});

function getActivity(db){
    let sql = `SELECT COALESCE(
                    (
                        SELECT 
                            date_end
                        FROM 
                            trn_train
                        WHERE 
                            expansion_id = 3
                        ORDER BY train_id DESC
                        LIMIT 1
                    ), 'TBA') AS sb,
                COALESCE(
                    (
                        SELECT
                            date_end
                        FROM 
                            trn_train
                        WHERE 
                            expansion_id = 4
                        ORDER BY train_id DESC
                        LIMIT 1
                    ), 'TBA') AS shb,
                COALESCE(
                    (
                        SELECT
                            date_end
                        FROM 
                            trn_train
                        WHERE 
                            expansion_id = 5
                        ORDER BY train_id DESC
                        LIMIT 1
                    ), 'TBA') AS ew`;

    db.each(sql, function(err, row){
        if (err) console.log(err);
        let sb_time     = row['sb']     == 'TBA' ? 'TBA' : moment(row['sb']).utc().format('HH:mm');
        let shb_time    = row['shb']    == 'TBA' ? 'TBA' : moment(row['shb']).utc().format('HH:mm');
        let ew_time     = row['ew']     == 'TBA' ? 'TBA' : moment(row['ew']).utc().format('HH:mm');

        client.user.setActivity(`SB: ${sb_time} ST, ShB: ${shb_time} ST, EW: ${ew_time} ST`);
        console.log('== [OK] Activity set!');
    })
}

function argDateParse(date) {
    return moment(new Date(new Date() - (date * 1000 * 60)))
}

function strToDb(str){
    return str.replace("'", "''")
}

client.on('ready', () => {
    getActivity(db)
});

client.on('messageCreate', async (message) => {
    if(message.author.bot) return;
    if(!message.content.startsWith(config.prefix)) {
        if (message.channel.id == config.channel_id){
            message.delete()
        } else {
            return;
        }
    };
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command == 'ver'){
        let statEmbed = {
            "title": `${client.user.username} ${config.version}`,
            "color": 6719231,
            "footer": {
                "text": "Developed by Masshiro Iro"
            },
            "fields": [
                {
                    "name": "Tag",
                    "value": client.user.tag,
                    "inline": false
                },
                {
                    "name": "Status",
                    "value": "Ok!",
                    "inline": false
                },
            ]
        };

        message.channel.send({ embeds: [statEmbed] })
    }
    
    if (command === 'sb' || command === 'shb' || command == 'ew') {
        if (message.channel.id == config.channel_id){
            let time = moment().utc();
            let exp; let exp_id;

            switch (command) {
                case 'sb':
                    exp     = 'Stormblood'
                    exp_id  = 3
                    break;
                case 'shb':
                    exp     = 'Shadowbringers'
                    exp_id  = 4
                    break;
                case 'ew':
                    exp     = 'Endwalker'
                    exp_id  = 5
                    break;
            }
            if (args.length > 0 && args[0].startsWith('-') && args[0].length > 1) {
                time = argDateParse(args.shift().slice(1))
            }
            let desc    = args.join(' ')

            let sql = `INSERT INTO trn_train (
                            user_id,
                            user_name,
                            expansion_id,
                            description,
                            date_end
                        ) VALUES (
                            '${message.author.id}',
                            '${strToDb(message.author.tag)}',
                            '${exp_id}',
                            '${strToDb(desc)}',
                            '${time.format()}'
                        );`;

            db.exec(sql, function(err){
                if (err) return console.log(err);
                var timeArr = config.timezones;
                var ebDesc = `\`\`${time.format('HH:mm')} UTC/ST\`\`\n`

                for (let i = 0; i < timeArr.length; i++){
                    var splitTime   = timeArr[i].split(';')
                    var timezone    = splitTime[0]
                    var zone        = splitTime[1]

                    ebDesc += `\`\`${time.clone().tz(zone).format('HH:mm')} ${timezone}\`\`\n`
                }

                let sbEmbed = new Discord.EmbedBuilder()
                    .setColor('#ff8282')
                    .setTitle(`[${exp}] ${args.join(' ')}`)
                    .setDescription(ebDesc)
                    .setFooter({ text: `Relayed by ${message.author.tag}`});

                console.log('== [OK] New train saved!');
                getActivity(db);
                message.channel.send({ embeds: [sbEmbed] });
                message.delete()
            })
        } else {
            message.channel.send('Wrong channel!');
        }
    }

});

client.login(process.env.BOT_TOKEN);
