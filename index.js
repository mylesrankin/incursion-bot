const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const esiJS = require('esiJS');
const axios = require('axios');
const eos = require('eve-online-sde');

const adapter = new FileSync('db.json');
const db = low(adapter);

db.defaults({ incursions: [] }).write();

const main = () => {
	return new Promise(async (resolve, reject) => {
		try {
			let eosTest = await eos.lookupByID('20000076');
			console.log(eosTest);
			let cachedIncursions = db.get('incursions').value();
			//console.log(cachedIncursions);
			let currentIncursions = await esiJS.incursions.incursions();
			db.set('incursions', currentIncursions).write();
			let newIncursions = currentIncursions.filter(comparer(cachedIncursions));
			if (newIncursions.length > 0) {
				console.log('New incursions detected');
				console.log(newIncursions);
				await pingIncursions(newIncursions);
				resolve();
			} else {
				console.log('No new incursions');
				resolve();
			}
		} catch (error) {
			reject(error);
		}
	});
};

const pingIncursions = (incursions) => {
	return new Promise((resolve, reject) => {
		Promise.all(incursions.map((incursion) => postToDiscord(incursion)))
			.then(() => resolve())
			.catch((err) => {
				console.error(err);
				reject(err);
			});
	});
};

const postToDiscord = (incursion) => {
	return new Promise(async (resolve, reject) => {
		let stagingSystem = await esiJS.universe.systems.systemInfo(incursion.staging_solar_system_id);
		let constellation = await esiJS.universe.constellations.constellationInfo(incursion.constellation_id);
		let region = await esiJS.universe.regions.regionInfo(constellation.region_id);
		let body = {
			username: 'ERIC: Incursion Edition',
			avatar_url: 'https://static01.nyt.com/images/2016/09/28/us/28xp-pepefrog/28xp-pepefrog-superJumbo.jpg',
			content: '@everyone',
			embeds: [
				{
					title: 'A new incursion has been detected',
					description: `${incursion.type} staging system is in **${stagingSystem.name}**`,
					color: 15258703,
					fields: [
						{
							name: 'Region',
							value: `${region.name}`,
							inline: true,
						},
						{
							name: 'Constellation',
							value: `${constellation.name}`,
							inline: true,
						},
						{
							name: 'Incursion State',
							value: `${incursion.state}`,
							inline: true,
						},
					],

					thumbnail: {
						url:
							'https://upload.wikimedia.org/wikipedia/commons/3/38/4-Nature-Wallpapers-2014-1_ukaavUI.jpg',
					},
					image: {
						url:
							'https://upload.wikimedia.org/wikipedia/commons/5/5a/A_picture_from_China_every_day_108.jpg',
					},
				},
			],
		};
		axios({
			url:
				'https://discordapp.com/api/webhooks/777241401808912415/-QaoGPWEx_0hGWQFioJd5HBZkG6LQ-DVxmb6qQkeHE305LobDGQXPzhjQSkYtwuAxedv',
			method: 'post',
			data: body,
			headers: { 'Content-Type': 'application/json' },
		})
			.then((res) => resolve(res))
			.catch((err) => {
				console.error(err);
				resolve(false);
			});
	});
};

function comparer(otherArray) {
	return function (current) {
		return (
			otherArray.filter(function (other) {
				return (
					other.staging_solar_system_id == current.staging_solar_system_id &&
					other.constellation_id == current.constellation_id
				);
			}).length == 0
		);
	};
}

main()
	.then((res) => {
		console.info('Finished executing');
		process.exit();
	})
	.catch((err) => {
		console.log(error);
		process.exit();
	});
