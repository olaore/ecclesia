import { faker } from '@faker-js/faker';

const FIRST_NAMES = [
  'Abba', 'Abosede', 'Ade', 'Adekunle', 'Adewale', 'Aisha', 'Amina', 'Amaka', 'Babajide', 'Bamidele',
  'Bolaji', 'Chidi', 'Chinedu', 'Chinelo', 'Damilola', 'Danjuma', 'Efe', 'Ejiro', 'Emeka', 'Eniola',
  'Fadekemi', 'Farouk', 'Femi', 'Folake', 'Funke', 'Ganiyu', 'Gbenga', 'Hassan', 'Ibrahim', 'Ifunanya',
  'Ige', 'Ijeoma', 'Ismail', 'Iyanuoluwa', 'Jubril', 'Kelechi', 'Kolawole', 'Kunle', 'Layi', 'Musa',
  'Ngozi', 'Nkechi', 'Obinna', 'Oluchi', 'Oluwaseun', 'Oluwatobiloba', 'Oma', 'Omotola', 'Osas', 'Oyelola',
  'Sade', 'Segun', 'Simisola', 'Taiwo', 'Tayo', 'Temidara', 'Tobi', 'Uche', 'Yejide', 'Yemi', 'Zainab'
];

const LAST_NAMES = [
  'Abiola', 'Adeyemi', 'Afolayan', 'Aguda', 'Ajanaku', 'Akintola', 'Alaba', 'Alimi', 'Aminu', 'Anumudu',
  'Arowolo', 'Asuquo', 'Awolowo', 'Azikiwe', 'Babangida', 'Bello', 'Danjuma', 'Ezekwesili', 'Fagbemi', 'Gbadamosi',
  'Ibrahim', 'Idris', 'Igwe', 'Iwu', 'Ize-Iyamu', 'Jakande', 'Kalu', 'Lawal', 'Macaulay', 'Mohammed',
  'Nwachukwu', 'Nwosu', 'Obasanjo', 'Odejayi', 'Odukoya', 'Ogunlesi', 'Ojo', 'Okereke', 'Okonjo', 'Okoro',
  'Olabisi', 'Olaniyi', 'Olaore', 'Oloyede', 'Onabanjo', 'Orizu', 'Ovia', 'Oyedepo', 'Salami', 'Saraki',
  'Shagari', 'Sowore', 'Tinubu', 'Uba', 'Umar', 'Usman', 'Wike', 'Yahaya', 'Yusuf'
];

const CITIES = [
  'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu', 'Benin City', 'Kaduna', 'Abeokuta', 'Warri',
  'Uyo', 'Calabar', 'Akure', 'Owerri', 'Jos', 'Ilorin', 'Osogbo', 'Minna', 'Bauchi', 'Sokoto'
];

const STREET_NAMES = [
  'Adeniran Ogunsanya', 'Bode Thomas', 'Herbert Macaulay', 'Adetokunbo Ademola', 'Amodu Tijani',
  'Isaac John', 'Toyin St', 'Allen Avenue', 'Opebi Rd', 'Ozumba Mbadiwe', 'Ahmadu Bello Way',
  'Nnamdi Azikiwe', 'Obafemi Awolowo', 'Kofo Abayomi', 'Sanusi Fafunwa', 'Aguiyi Ironsi'
];

const AREAS = [
  'Surulere', 'Ikeja', 'Lekki Phase 1', 'Victoria Island', 'Garki', 'Wuse 2', 'Maitama', 'Asokoro',
  'Old Gra', 'New Gra', 'Bodija', 'Akobo', 'Trans Amadi', 'D-Line', 'Independence Layout', 'Ogui Road'
];

export function getNigerianFullName() {
  const firstName = faker.helpers.arrayElement(FIRST_NAMES);
  const lastName = faker.helpers.arrayElement(LAST_NAMES);
  return `${firstName} ${lastName}`;
}

export function getNigerianPhone() {
  const prefixes = ['0803', '0806', '0813', '0816', '0802', '0808', '0812', '0703', '0903', '0805', '0807'];
  const prefix = faker.helpers.arrayElement(prefixes);
  const suffix = faker.string.numeric(7);
  return `${prefix}${suffix}`;
}

export function getNigerianAddress() {
  const houseNum = faker.number.int({ min: 1, max: 150 });
  const street = faker.helpers.arrayElement(STREET_NAMES);
  const area = faker.helpers.arrayElement(AREAS);
  const city = faker.helpers.arrayElement(CITIES);
  return `${houseNum}, ${street} St, ${area}, ${city}`;
}

export function getNigerianOccupation() {
  const occupations = [
    'Software Engineer', 'Lecturer', 'Business Owner', 'Trader', 'Civil Servant', 'Nurse', 'Doctor',
    'Lawyer', 'Accountant', 'Tailor', 'Fashion Designer', 'Mechanic', 'Contractor', 'Consultant',
    'Banker', 'Artist', 'Student', 'Pharmacist', 'Architect', 'Estate Agent'
  ];
  return faker.helpers.arrayElement(occupations);
}
