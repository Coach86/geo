#!/usr/bin/env node

// Script to generate the CLI command with all competitorsForUrls parameters

const urlsAndCompetitors = [
  ["https://www.agryco.com/", "Yara International,BASF,Bayer Crop Science,Syngenta,Corteva Agriscience"],
  ["https://alan.com/", "Doctolib,Qare,Livi,WeWard,Maiia"],
  ["https://alice-bob.com/", "Rigetti Computing,D-Wave Systems,IonQ,Quantum Circuits,PsiQuantum"],
  ["https://www.backmarket.fr/", "Recommerce,Certideal,Smaaart,Amazon Renewed,Fnac 2nde Vie"],
  ["https://www.blablacar.fr/", "Karos,Mobicoop,FlixBus,OuiCar,Heetch"],
  ["https://www.brevo.com/fr/", "Mailchimp,Constant Contact,Sendinblue,ActiveCampaign,GetResponse"],
  ["https://www.chapsvision.fr/", "Thales Group,Atos,Dassault Systèmes,Capgemini,Sopra Steria"],
  ["https://www.clubfunding.eu/", "Homunity,Anaxago,Wiseed,Fundimmo,Raizers"],
  ["https://contentsquare.com/", "Adobe,Google Analytics,Hotjar,Mixpanel,Amplitude"],
  ["https://descartesunderwriting.com/", "Nephila Capital,Swiss Re,Munich Re,AXA Climate,The Climate Corporation"],
  ["https://www.doctolib.fr/", "Zava,Qare,Livi,Jameda,Medi24"],
  ["https://ecovadis.com/", "Sustainalytics,MSCI ESG Ratings,ISS ESG,RepRisk,Vigeo Eiris"],
  ["https://ekwateur.fr/", "EDF Renouvelables,Engie,TotalEnergies,Iberdrola,Planète Oui"],
  ["https://www.go-electra.com/", "Ionity,TotalEnergies,Fastned,Allego,Tesla Supercharger"],
  ["https://www.equativ.com/", "The Trade Desk,Google Ad Manager,Xandr,PubMatic,Magnite"],
  ["https://www.exotec.com/", "GreyOrange,Geek+,Locus Robotics,Fetch Robotics,6 River Systems"],
  ["https://www.flying-whales.com/", "Lockheed Martin,Airbus,Boeing,Hybrid Air Vehicles,Aeroscraft Corporation"],
  ["https://gojob.com/", "Mistertemp',Qapa,StaffMe,Side,Iziwork"],
  ["https://homagames.com/", "Voodoo,Kwalee,Lion Studios,SayGames,Rollic Games"],
  ["https://innovafeed.com/", "Ÿnsect,Protix,AgriProtein,Enterra Feed Corporation,Hexafly"],
  ["https://www.ledger.com/", "Trezor,KeepKey,SafePal,Ellipal,CoolWallet"],
  ["https://www.lehibou.com/", "Malt,Freelance.com,Comet,Upwork,Freelancer.fr"],
  ["https://www.malt.fr/", "Freelancer.com,Upwork,Fiverr,Comet,Coworkees"],
  ["https://www.mirakl.com/", "VTEX,Marketplacer,Spryker,Shopify,BigCommerce"],
  ["https://www.mistertemp.com/", "Adecco France,Manpower France,Randstad France,Crit,Synergie"],
  ["https://mistral.ai/", "OpenAI,Anthropic,Cohere,Google DeepMind,Hugging Face"],
  ["https://www.nw-groupe.com/", "TotalEnergies,EDF Renouvelables,Engie,Enedis,Tesla"],
  ["https://payfit.com/", "ADP,Sage,Cegid,Personio,SD Worx"],
  ["https://www.pennylane.com/", "Sage,Cegid,QuickBooks,Axonaut,Sellsy"],
  ["https://www.pigment.com/", "Anaplan,Adaptive Insights,Workday,Oracle Hyperion,Planful"],
  ["https://france.qair.energy/", "EDF Renewables,Engie,TotalEnergies Renewables,Akuo Energy,Neoen"],
  ["https://qonto.com/", "Shine,N26,Revolut,Anytime,Manager.one"],
  ["https://www.spendesk.com/", "Brex,Pleo,Soldo,Airbase,Ramp"],
  ["https://www.swile.co/", "Edenred,Sodexo,Up Group,Lunchr,Nexity"],
  ["https://verkor.com/", "Northvolt,ACC (Automotive Cells Company),Saft,CATL,LG Energy Solution"],
  ["https://fr.vestiairecollective.com/", "The RealReal,ThredUp,Poshmark,Depop,Rebag"],
  ["https://voodoo.io/", "Zynga,Playrix,Supercell,King,Rovio Entertainment"],
  ["https://weezevent.com/", "Billetweb,Digitick,Eventbrite,See Tickets,Ticketmaster France"],
  ["https://corp.worldia.com/", "Evaneos,Terres d'Aventure,Voyageurs du Monde,Marco Vasco,Club Med"],
  ["https://www.zeplug.com/", "TotalEnergies,Izivia,Freshmile,Bornes Solutions,EVBox"]
];

// Generate the command
let command = 'node scripts/test-visibility-standalone.js';

// Add your other parameters
command += ' --runs 1'; // Example
command += ' --model gpt-4o'; // Example

// Add all competitorsForUrls in a single parameter
command += ' --competitorsForUrls';
urlsAndCompetitors.forEach(([url, competitors]) => {
  command += ` ${url} "${competitors}"`;
});

console.log('Generated command:');
console.log('==================');
console.log(command);
console.log('==================');
console.log(`\nCommand length: ${command.length} characters`);

// Also save to a file
const fs = require('fs');
fs.writeFileSync('run-with-competitors.sh', `#!/bin/bash\n${command}\n`, 'utf8');
console.log('\nCommand also saved to: run-with-competitors.sh');
console.log('You can run it with: bash run-with-competitors.sh');