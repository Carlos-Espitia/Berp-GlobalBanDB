/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable space-infix-ops */
/* eslint-disable object-curly-spacing */
/* eslint-disable comma-dangle */
/* eslint-disable object-curly-newline */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable newline-before-return */
/* eslint-disable no-multiple-empty-lines */
// eslint-disable-next-line no-multiple-empty-lines

import { Player, PluginApi } from './@interface/pluginApi.i'
import { config } from './config'

class globalbanDB {
  private api: PluginApi

  constructor(api: PluginApi) {
    this.api = api
  }

  public async onLoaded(): Promise<void> {
    this.api.getLogger().info('GlobalBan plugin loaded!')
  }
  public onEnabled(): void {
    this.api.getLogger().info('GlobalBan plugin enabled!')

    if(config.AdminKey != '') {
      this.api.getCommandManager().registerConsoleCommand({
        command: 'globalban',
        aliases: ['gb'],
        description: 'global ban players from console',
        usage: 'globalban <xuid/gamertag>'
      }, async (args) => {
        if(!args[0]) return this.api.getLogger().error(`Gamertag or xuid has not been specified!`)
        console.log(await GlobalBanDB.BanPlayer(args[0]))
      })
      this.api.getCommandManager().registerConsoleCommand({
        command: 'globalunban',
        aliases: ['gu'],
        description: 'global unban players from console',
        usage: 'globalunban <xuid/gamertag>'
      }, async (args) => {
        if(!args[0]) return this.api.getLogger().error(`Gamertag or xuid has not been specified!`)
        console.log(await GlobalBanDB.UnbanPlayer(args[0]))
      })

      this.api.getCommandManager().registerConsoleCommand({
        command: 'globalplayerlookup',
        aliases: ['gplu'],
        description: 'look up globally banned player from console.',
        usage: 'globalplayerlookup <xuid/gamertag>'
      }, async (args) => {
        if(!args[0]) return console.log('Gamertag or xuid has not been specified!')
        // console.log(await GlobalBanDB.PlayerLookUp(args[0])[0])
        console.log(await GlobalBanDB.PlayerLookUp(args[0]))

      })
    
      ////////////////////

      this.api.getCommandManager().registerCommand({
        command: 'lookup',
        aliases: ['l'],
        description: 'look up globally banned player in game.',
      }, async (res) => {
        if(!res.args[0]) return res.sender.sendMessage('Gamertag or xuid has not been specified!')
        const lookupRes: BannedPlayerInfo | string = await GlobalBanDB.PlayerLookUp(res.args[0])
        if(typeof lookupRes == 'object') {
          res.sender.sendMessage(`  §7xuid: ${lookupRes.xuid}\n` + 
          `  §7Gamertag: ${lookupRes.gamertag}\n` +
          `  §7Rason: ${lookupRes.reason}\n` + 
          `  §7proof: ${lookupRes.proof}\n` + 
          `  §7Banned By: ${lookupRes.bannedBy}\n` + 
          `  §7Date: ${lookupRes.date}`)
        } else {
          res.sender.sendMessage(`§7${lookupRes}`)
        }
      })

      if(config.AdminXuid == '') {
        console.log('Admin xuid was not provided, you will not be able to use in game commands without providing admin xuid')
      } else {
        this.api.getCommandManager().registerCommand({
          command: 'ban',
          aliases: ['b'],
          description: 'Ban players in game',
        }, async (res) => {
          if(!res.args[0]) return res.sender.sendMessage('Gamertag or xuid has not been specified!')
          if(config.AdminXuid != res.sender.getXuid()) return res.sender.sendMessage('You Do Not Have Permission To Globally Ban Players!')
          const banRes: BanningPlayerPost | string = await GlobalBanDB.BanPlayer(res.args[0])
          if(typeof banRes == 'object') {
            res.sender.sendMessage(`  §7${banRes.message}\n`+
            `  §7Xuid: ${banRes.xuid}\n` +
            `  §7Gamertag: ${banRes.gamertag}\n` +
            `  §7Banned By: ${banRes.bannedBy}\n` +
            `  §7Date: ${banRes.date}\n`)
          } else {
            res.sender.sendMessage(`§7${banRes}`)
          }
          res.sender.executeCommand(`kick ${res.args[0]} "${config.KickMessage}"`)
        })
        this.api.getCommandManager().registerCommand({
          command: 'unban',
          aliases: ['u'],
          description: 'Unban players in game',
        }, async (res) => {
          if(!res.args[0]) return res.sender.sendMessage('Gamertag or xuid has not been specified!')
          if(config.AdminXuid != res.sender.getXuid()) return res.sender.sendMessage('You Do Not Have Permission To Globally Unban Players!')
          const unbanRes: UnbanningPlayerDelete | string = await GlobalBanDB.UnbanPlayer(res.args[0])
          if(typeof unbanRes == 'object') {
            res.sender.sendMessage(`  §7${unbanRes.message}\n`+
            `  §7Xuid: ${unbanRes.xuid}\n` +
            `  §7Gamertag: ${unbanRes.gamertag}\n`)
          } else {
            res.sender.sendMessage(`§7${unbanRes}`)
          }
        })
      }
    }
    
    //////////////////////////////////
    this.api.getEventManager().on('PlayerInitialized', async (player) => {
      if(config.AutoKickGlobalBannedPlayers) {
        const playerData: string | object = await GlobalBanDB.PlayerLookUp(player.getXuid())
        console.log(playerData)
        if(typeof playerData == 'string') return 
        console.log(`Kicked banned player. Name: ${player.getName()} XUID: ${player.getXuid()}`)
        player.executeCommand(`kick "${player.getXuid()}" "${config.KickMessage}"`)
        this.api.getCommandManager()
        .executeCommand(`tellraw @a {\"rawtext\":[{\"text\":\"§a§l§aPlayer§g (${player.getName()})§a has joined on §g(${player.getDevice()})§a, their XUID is §g(${player.getXuid()})\"}]}`);
      }
    })
  }
  public onDisabled(): void {
    this.api.getLogger().info('GlobalBan plugin disabled, crashed beRP!')
    process.exit(1);
  }
}

//////////////////////////////////////////////

import axios from "axios"
const DB_API = 'https://mcbe-playerbans.herokuapp.com'
//https://mcbe-playerbans.herokuapp.com
//http://localhost:5000

class BannedPlayersDB {
  BannedPlayers: Array<BannedPlayerInfo>;
  constructor() {
    this.BannedPlayers = new Array<BannedPlayerInfo>()
  }
}

class BannedPlayerInfo {
  xuid: number | undefined
  gamertag: string | undefined
  reason: string | undefined
  proof: string | undefined
  bannedBy: string | undefined
  date: string | undefined
}
class BanningPlayerPost {
  message: string | undefined
  xuid: number | undefined
  gamertag: string | undefined
  reason: string | undefined
  proof: string | undefined
  bannedBy: string | undefined
  date: string | undefined
}
class UnbanningPlayerDelete {
  message: string | undefined
  xuid: number | undefined
  gamertag: string | undefined
}

class globalBanDB {
  async GetBannedPlayersDB(): Promise<BannedPlayersDB> {
    // require auth key 
    try {
      return (await axios.get(`${DB_API}/BannedPlayers`, {
        headers: {
          "authorization": config.AdminKey
        }
      })).data
    } catch (err) {
      return err.response.data
    }
  }

  async PlayerLookUp(gamertagORxuid: string | number): Promise<BannedPlayerInfo | any> {
    try{
      return (await axios.get(`${DB_API}/BannedPlayers/LookUp/${gamertagORxuid}`)).data
    } catch (err) {
      return `We couldn't find ${gamertagORxuid} in the database or something went wrong.`
      // return err.response.data
    }
  }

  async BanPlayer(gamertagORxuid: string | number): Promise<any> {
    // require auth key or admin key
    try {
      return (await axios.post(`${DB_API}/BannedPlayers/Add/${gamertagORxuid}`,undefined, {
        headers: {
          "authorization": config.AdminKey
        }
      })).data
    } catch (err) {
      return err.response.data
    }
  }
  async UnbanPlayer(gamertagORxuid: string | number): Promise<any> {
    // require auth key 
    try {
      return await (await axios.delete(`${DB_API}/BannedPlayers/Remove/${gamertagORxuid}`,{
        headers: {
          "authorization": config.AdminKey
        }
      })).data
    } catch (err) {
      return err.response.data
    }
  }
}

const GlobalBanDB = new globalBanDB()


export = globalbanDB
