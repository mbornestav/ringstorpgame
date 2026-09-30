import { getLang } from '../../side/i18n';

const sv = {
  collection: 'SPEL FRÅN RINGSTORP', choose: 'Vad vill du spela?',
  intro: 'Två världar. Nya äventyr precis runt hörnet.',
  ringstorp: 'Ringstorp Run', runTag: 'ARKADÄVENTYR · 3 BANOR',
  runDescription: 'Ett paket, ett hemligt uppdrag och ett kapelljobb. Hitta din väg genom Ringstorp.',
  runAction: 'Välj bana', carl: 'Carl-Ottos spel', carlTag: 'SMÅ ÄVENTYR · STOR UPPTÄCKARLUST',
  carlDescription: 'På med den blå hjälmen! Följ med Carl-Otto på en cykeltur till förskolan.',
  carlAction: 'Upptäck spelen', back: 'Alla spel', first: 'SPEL 1',
  bikeTitle: 'Till förskolan', bikeDescription: 'Det är en fin morgon i Ringstorp. Hjälp Carl-Otto att cykla till den röda förskolan och väja för äpplena som faller från träden.',
  bikeInstructions: 'Cykeln rullar av sig själv. Styr med piltangenterna eller WASD. På en pekskärm använder du pilknapparna.',
  bikeHint: 'Titta efter ringarna på marken – där faller nästa äpple!',
  start: 'Börja cykla', pause: 'Pausa', resume: 'Fortsätt cykla', again: 'Cykla igen',
  paused: 'En liten paus', pausedBody: 'Cykeln väntar här tills du är redo.',
  won: 'Framme vid förskolan!', wonBody: 'Bra cyklat, Carl-Otto! Parkera cykeln – nu väntar en dag med lek.',
  lost: 'Hoppsan, ett äpple!', lostBody: 'Vi tar en ny cykeltur! Håll utkik efter ringarna på marken och styr undan.',
  home: 'Hemma', preschool: 'Förskolan', left: 'm kvar', hearts: 'Hjärtan', avoided: 'äpplen undvikna',
  steer: 'STYR', pauseHint: 'ESC · PAUS', up: 'Styr uppåt', down: 'Styr nedåt',
  moveLeft: 'Styr åt vänster', moveRight: 'Styr åt höger',
  footer: 'EN LITEN SAMLING ÄVENTYR I HELSINGBORG', menu: 'Välj spel',
};

const en: Record<keyof typeof sv, string> = {
  collection: 'GAMES FROM RINGSTORP', choose: 'What shall we play?', intro: 'Two worlds. New adventures just around the corner.',
  ringstorp: 'Ringstorp Run', runTag: 'ARCADE ADVENTURES · 3 LEVELS',
  runDescription: 'A package, a secret assignment and a kapell job. Find your way through Ringstorp.', runAction: 'Choose a level',
  carl: 'Carl-Ottos spel', carlTag: 'LITTLE ADVENTURES · BIG CURIOSITY',
  carlDescription: 'Blue helmet on! Join Carl-Otto on a bike ride to preschool.', carlAction: 'Explore the games',
  back: 'All games', first: 'GAME 1', bikeTitle: 'Off to preschool',
  bikeDescription: 'It’s a lovely morning in Ringstorp. Help Carl-Otto cycle to the red preschool and dodge the apples falling from the trees.',
  bikeInstructions: 'The bike rolls along by itself. Steer with the arrow keys or WASD. On a touchscreen, use the arrow buttons.',
  bikeHint: 'Watch the rings on the ground – that’s where the next apple will fall!',
  start: 'Start cycling', pause: 'Pause', resume: 'Keep cycling', again: 'Ride again',
  paused: 'A little break', pausedBody: 'Your bike will wait here until you’re ready.',
  won: 'You made it to preschool!', wonBody: 'Well done, Carl-Otto! Park your bike – a day of play is waiting.',
  lost: 'Oops, an apple!', lostBody: 'Let’s try another ride! Watch the rings on the ground and steer clear.',
  home: 'Home', preschool: 'Preschool', left: 'm left', hearts: 'Hearts', avoided: 'apples avoided',
  steer: 'STEER', pauseHint: 'ESC · PAUSE', up: 'Steer up', down: 'Steer down', moveLeft: 'Steer left', moveRight: 'Steer right',
  footer: 'A LITTLE COLLECTION OF ADVENTURES IN HELSINGBORG', menu: 'Choose a game',
};

export const familyText = (key: keyof typeof sv): string => (getLang() === 'sv' ? sv : en)[key];
