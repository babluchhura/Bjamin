import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Lang = 'en' | 'hi' | 'or';

type Entry = { en: string; hi: string; or: string };

const D: Record<string, Entry> = {
  'nav.home': { en: 'Home', hi: 'होम', or: 'ମୁଖ୍ୟ ପୃଷ୍ଠା' },
  'nav.search': { en: 'Search buses', hi: 'बस खोजें', or: 'ବସ୍ ଖୋଜନ୍ତୁ' },
  'nav.bookings': { en: 'My bookings', hi: 'मेरी बुकिंग', or: 'ମୋ ବୁକିଂ' },
  'nav.about': { en: 'About us', hi: 'हमारे बारे में', or: 'ଆମ ବିଷୟରେ' },
  'nav.contact': { en: 'Contact', hi: 'संपर्क', or: 'ଯୋଗାଯୋଗ' },
  'nav.faq': { en: 'FAQ', hi: 'सामान्य प्रश्न', or: 'ସାଧାରଣ ପ୍ରଶ୍ନ' },
  'nav.login': { en: 'Sign in', hi: 'साइन इन', or: 'ସାଇନ୍ ଇନ୍' },
  'nav.register': { en: 'Create account', hi: 'खाता बनाएं', or: 'ଖାତା ଖୋଲନ୍ତୁ' },
  'nav.account': { en: 'My account', hi: 'मेरा खाता', or: 'ମୋ ଖାତା' },
  'nav.logout': { en: 'Sign out', hi: 'साइन आउट', or: 'ସାଇନ୍ ଆଉଟ୍' },
  'nav.admin': { en: 'Admin panel', hi: 'एडमिन पैनल', or: 'ଆଡମିନ୍ ପ୍ୟାନେଲ୍' },

  'common.bookNow': { en: 'Book now', hi: 'अभी बुक करें', or: 'ବର୍ତ୍ତମାନ ବୁକ୍ କରନ୍ତୁ' },
  'common.searchBuses': { en: 'Search buses', hi: 'बस खोजें', or: 'ବସ୍ ଖୋଜନ୍ତୁ' },
  'common.from': { en: 'From', hi: 'कहाँ से', or: 'କେଉଁଠାରୁ' },
  'common.to': { en: 'To', hi: 'कहाँ तक', or: 'କେଉଁଠିକୁ' },
  'common.date': { en: 'Journey date', hi: 'यात्रा तिथि', or: 'ଯାତ୍ରା ତାରିଖ' },
  'common.passengers': { en: 'Passengers', hi: 'यात्री', or: 'ଯାତ୍ରୀ' },
  'common.seat': { en: 'Seat', hi: 'सीट', or: 'ସିଟ୍' },
  'common.seats': { en: 'Seats', hi: 'सीटें', or: 'ସିଟ୍‌ଗୁଡ଼ିକ' },
  'common.continue': { en: 'Continue', hi: 'आगे बढ़ें', or: 'ଆଗକୁ ବଢ଼ନ୍ତୁ' },
  'common.back': { en: 'Back', hi: 'वापस', or: 'ପଛକୁ' },
  'common.cancel': { en: 'Cancel', hi: 'रद्द करें', or: 'ବାତିଲ୍ କରନ୍ତୁ' },
  'common.save': { en: 'Save', hi: 'सहेजें', or: 'ସଞ୍ଚୟ କରନ୍ତୁ' },
  'common.loading': { en: 'Loading…', hi: 'लोड हो रहा है…', or: 'ଲୋଡ୍ ହେଉଛି…' },
  'common.viewAll': { en: 'View all', hi: 'सभी देखें', or: 'ସମସ୍ତ ଦେଖନ୍ତୁ' },
  'common.download': { en: 'Download', hi: 'डाउनलोड', or: 'ଡାଉନଲୋଡ୍' },
  'common.total': { en: 'Total', hi: 'कुल', or: 'ମୋଟ' },
  'common.fare': { en: 'Fare', hi: 'किराया', or: 'ଭାଡ଼ା' },
  'common.discount': { en: 'Discount', hi: 'छूट', or: 'ରିହାତି' },
  'common.apply': { en: 'Apply', hi: 'लागू करें', or: 'ଲାଗୁ କରନ୍ତୁ' },
  'common.remove': { en: 'Remove', hi: 'हटाएं', or: 'ହଟାନ୍ତୁ' },
  'common.name': { en: 'Name', hi: 'नाम', or: 'ନାମ' },
  'common.email': { en: 'Email', hi: 'ईमेल', or: 'ଇମେଲ୍' },
  'common.phone': { en: 'Mobile number', hi: 'मोबाइल नंबर', or: 'ମୋବାଇଲ୍ ନମ୍ବର' },
  'common.password': { en: 'Password', hi: 'पासवर्ड', or: 'ପାସୱାର୍ଡ' },
  'common.age': { en: 'Age', hi: 'उम्र', or: 'ବୟସ' },
  'common.gender': { en: 'Gender', hi: 'लिंग', or: 'ଲିଙ୍ଗ' },
  'common.male': { en: 'Male', hi: 'पुरुष', or: 'ପୁରୁଷ' },
  'common.female': { en: 'Female', hi: 'महिला', or: 'ମହିଳା' },
  'common.other': { en: 'Other', hi: 'अन्य', or: 'ଅନ୍ୟ' },
  'common.status': { en: 'Status', hi: 'स्थिति', or: 'ସ୍ଥିତି' },
  'common.actions': { en: 'Actions', hi: 'कार्य', or: 'କାର୍ଯ୍ୟ' },
  'common.search': { en: 'Search', hi: 'खोजें', or: 'ଖୋଜନ୍ତୁ' },
  'common.filters': { en: 'Filters', hi: 'फ़िल्टर', or: 'ଫିଲ୍ଟର' },
  'common.reset': { en: 'Reset', hi: 'रीसेट', or: 'ରିସେଟ୍' },
  'common.noResults': { en: 'Nothing found', hi: 'कुछ नहीं मिला', or: 'କିଛି ମିଳିଲା ନାହିଁ' },
  'common.yes': { en: 'Yes', hi: 'हाँ', or: 'ହଁ' },
  'common.no': { en: 'No', hi: 'नहीं', or: 'ନା' },

  'home.heroTitle': { en: 'Book Odisha bus tickets in under two minutes', hi: 'दो मिनट में ओडिशा बस टिकट बुक करें', or: 'ଦୁଇ ମିନିଟରେ ଓଡ଼ିଶା ବସ୍ ଟିକେଟ୍ ବୁକ୍ କରନ୍ତୁ' },
  'home.heroSubtitle': { en: 'Live seat maps, verified operators and instant e-tickets across Bhubaneswar, Cuttack, Puri, Sambalpur and every corner of Odisha.', hi: 'लाइव सीट मैप, सत्यापित ऑपरेटर और तुरंत ई-टिकट — भुवनेश्वर, कटक, पुरी, संबलपुर और पूरे ओडिशा के लिए।', or: 'ଲାଇଭ୍ ସିଟ୍ ମ୍ୟାପ୍, ଯାଞ୍ଚିତ ଅପରେଟର ଏବଂ ତୁରନ୍ତ ଇ-ଟିକେଟ୍ — ଭୁବନେଶ୍ୱର, କଟକ, ପୁରୀ, ସମ୍ବଲପୁର ଏବଂ ସାରା ଓଡ଼ିଶା ପାଇଁ।' },
  'home.popularRoutes': { en: 'Popular routes', hi: 'लोकप्रिय मार्ग', or: 'ଲୋକପ୍ରିୟ ମାର୍ଗ' },
  'home.whyTitle': { en: 'Why travellers choose us', hi: 'यात्री हमें क्यों चुनते हैं', or: 'ଯାତ୍ରୀମାନେ ଆମକୁ କାହିଁକି ବାଛନ୍ତି' },
  'home.why1': { en: 'Real-time seat availability', hi: 'रीयल-टाइम सीट उपलब्धता', or: 'ରିଅଲ୍-ଟାଇମ୍ ସିଟ୍ ଉପଲବ୍ଧତା' },
  'home.why1Body': { en: 'Seats lock the moment you select them, so what you see is exactly what you get.', hi: 'सीट चुनते ही लॉक हो जाती है, इसलिए जो दिखता है वही मिलता है।', or: 'ଆପଣ ସିଟ୍ ବାଛିବା ମାତ୍ରେ ଲକ୍ ହୋଇଯାଏ, ତେଣୁ ଯାହା ଦେଖନ୍ତି ତାହା ହିଁ ମିଳେ।' },
  'home.why2': { en: 'Secure Razorpay payments', hi: 'सुरक्षित Razorpay भुगतान', or: 'ସୁରକ୍ଷିତ Razorpay ଦେୟ' },
  'home.why2Body': { en: 'UPI, cards and net banking verified on our server before any ticket is issued.', hi: 'यूपीआई, कार्ड और नेट बैंकिंग सर्वर पर सत्यापित होने के बाद ही टिकट जारी होता है।', or: 'ୟୁପିଆଇ, କାର୍ଡ ଏବଂ ନେଟ୍ ବ୍ୟାଙ୍କିଂ ସର୍ଭରରେ ଯାଞ୍ଚ ହେବା ପରେ ହିଁ ଟିକେଟ୍ ମିଳେ।' },
  'home.why3': { en: 'Transparent cancellation', hi: 'पारदर्शी रद्दीकरण', or: 'ସ୍ୱଚ୍ଛ ବାତିଲ୍' },
  'home.why3Body': { en: 'Cancel in one click and see your exact refund before you confirm.', hi: 'एक क्लिक में रद्द करें और पुष्टि से पहले अपना रिफंड देखें।', or: 'ଏକ କ୍ଲିକ୍‌ରେ ବାତିଲ୍ କରନ୍ତୁ ଏବଂ ନିଶ୍ଚିତ କରିବା ପୂର୍ବରୁ ରିଫଣ୍ଡ ଦେଖନ୍ତୁ।' },
  'home.howTitle': { en: 'How booking works', hi: 'बुकिंग कैसे होती है', or: 'ବୁକିଂ କିପରି ହୁଏ' },
  'home.step1': { en: 'Search your route', hi: 'अपना मार्ग खोजें', or: 'ଆପଣଙ୍କ ମାର୍ଗ ଖୋଜନ୍ତୁ' },
  'home.step1Body': { en: 'Pick from, to and your travel date to see every departure.', hi: 'कहाँ से, कहाँ तक और तारीख चुनें और सभी बसें देखें।', or: 'କେଉଁଠାରୁ, କେଉଁଠିକୁ ଏବଂ ତାରିଖ ବାଛନ୍ତୁ, ସମସ୍ତ ବସ୍ ଦେଖନ୍ତୁ।' },
  'home.step2': { en: 'Choose your seat', hi: 'अपनी सीट चुनें', or: 'ଆପଣଙ୍କ ସିଟ୍ ବାଛନ୍ତୁ' },
  'home.step2Body': { en: 'Interactive deck layout with ladies seats and live pricing.', hi: 'लेडीज़ सीट और लाइव किराये के साथ इंटरैक्टिव सीट लेआउट।', or: 'ମହିଳା ସିଟ୍ ଏବଂ ଲାଇଭ୍ ଭାଡ଼ା ସହିତ ଇଣ୍ଟରାକ୍ଟିଭ୍ ସିଟ୍ ଲେଆଉଟ୍।' },
  'home.step3': { en: 'Pay and travel', hi: 'भुगतान करें और यात्रा करें', or: 'ଦେୟ ଦିଅନ୍ତୁ ଏବଂ ଯାତ୍ରା କରନ୍ତୁ' },
  'home.step3Body': { en: 'Verified payment issues your e-ticket instantly by email and SMS.', hi: 'सत्यापित भुगतान के तुरंत बाद ई-टिकट ईमेल और एसएमएस पर मिलता है।', or: 'ଯାଞ୍ଚିତ ଦେୟ ପରେ ଇ-ଟିକେଟ୍ ତୁରନ୍ତ ଇମେଲ୍ ଏବଂ ଏସଏମଏସରେ ମିଳେ।' },
  'home.reviewsTitle': { en: 'Traveller reviews', hi: 'यात्रियों की राय', or: 'ଯାତ୍ରୀଙ୍କ ମତାମତ' },
  'home.offersTitle': { en: 'Offers running now', hi: 'चालू ऑफ़र', or: 'ଚାଲୁ ଥିବା ଅଫର' },
  'home.ctaTitle': { en: 'Ready for your next journey?', hi: 'अगली यात्रा के लिए तैयार?', or: 'ପରବର୍ତ୍ତୀ ଯାତ୍ରା ପାଇଁ ପ୍ରସ୍ତୁତ?' },
  'home.ctaBody': { en: 'Compare every operator on your route and lock your seat in seconds.', hi: 'अपने मार्ग के सभी ऑपरेटरों की तुलना करें और सेकंडों में सीट बुक करें।', or: 'ଆପଣଙ୍କ ମାର୍ଗର ସମସ୍ତ ଅପରେଟର ତୁଳନା କରନ୍ତୁ ଏବଂ ସେକେଣ୍ଡରେ ସିଟ୍ ବୁକ୍ କରନ୍ତୁ।' },
  'home.viewAllRoutes': { en: 'Browse all routes', hi: 'सभी मार्ग देखें', or: 'ସମସ୍ତ ମାର୍ଗ ଦେଖନ୍ତୁ' },
  'home.support': { en: 'Need help booking?', hi: 'बुकिंग में मदद चाहिए?', or: 'ବୁକିଂରେ ସାହାଯ୍ୟ ଦରକାର?' },
  'home.today': { en: 'Today', hi: 'आज', or: 'ଆଜି' },
  'home.tomorrow': { en: 'Tomorrow', hi: 'कल', or: 'କାଲି' },

  'search.title': { en: 'Search buses across Odisha', hi: 'ओडिशा में बसें खोजें', or: 'ଓଡ଼ିଶାରେ ବସ୍ ଖୋଜନ୍ତୁ' },
  'search.subtitle': { en: 'Compare operators, timings and fares in one place.', hi: 'ऑपरेटर, समय और किराया एक जगह तुलना करें।', or: 'ଅପରେଟର, ସମୟ ଏବଂ ଭାଡ଼ା ଏକ ସ୍ଥାନରେ ତୁଳନା କରନ୍ତୁ।' },
  'search.departure': { en: 'Departure', hi: 'प्रस्थान', or: 'ପ୍ରସ୍ଥାନ' },
  'search.arrival': { en: 'Arrival', hi: 'आगमन', or: 'ଆଗମନ' },
  'search.duration': { en: 'Duration', hi: 'अवधि', or: 'ଅବଧି' },
  'search.available': { en: 'seats available', hi: 'सीटें उपलब्ध', or: 'ସିଟ୍ ଉପଲବ୍ଧ' },
  'search.ratings': { en: 'Ratings', hi: 'रेटिंग', or: 'ରେଟିଂ' },
  'search.amenities': { en: 'Amenities', hi: 'सुविधाएं', or: 'ସୁବିଧା' },
  'search.busType': { en: 'Bus type', hi: 'बस प्रकार', or: 'ବସ୍ ପ୍ରକାର' },
  'search.allTypes': { en: 'All bus types', hi: 'सभी प्रकार', or: 'ସମସ୍ତ ପ୍ରକାର' },
  'search.noBuses': { en: 'No buses on this route for the selected date', hi: 'चुनी गई तारीख पर इस मार्ग पर कोई बस नहीं', or: 'ବଛା ତାରିଖରେ ଏହି ମାର୍ଗରେ କୌଣସି ବସ୍ ନାହିଁ' },
  'search.noBusesBody': { en: 'Try the next day, or search a nearby city.', hi: 'अगला दिन आज़माएं या नज़दीकी शहर खोजें।', or: 'ପରବର୍ତ୍ତୀ ଦିନ ଚେଷ୍ଟା କରନ୍ତୁ କିମ୍ବା ନିକଟ ସହର ଖୋଜନ୍ତୁ।' },
  'search.sortBy': { en: 'Sort by', hi: 'क्रमबद्ध करें', or: 'କ୍ରମରେ ସଜାଡ଼ନ୍ତୁ' },
  'search.priceLow': { en: 'Price: low to high', hi: 'किराया: कम से ज़्यादा', or: 'ଭାଡ଼ା: କମରୁ ଅଧିକ' },
  'search.priceHigh': { en: 'Price: high to low', hi: 'किराया: ज़्यादा से कम', or: 'ଭାଡ଼ା: ଅଧିକରୁ କମ' },
  'search.departureEarly': { en: 'Departure: earliest', hi: 'प्रस्थान: सबसे पहले', or: 'ପ୍ରସ୍ଥାନ: ସର୍ବପ୍ରଥମେ' },
  'search.departureLate': { en: 'Departure: latest', hi: 'प्रस्थान: सबसे बाद', or: 'ପ୍ରସ୍ଥାନ: ସର୍ବଶେଷରେ' },
  'search.ratingHigh': { en: 'Rating: highest', hi: 'रेटिंग: सबसे ऊंची', or: 'ରେଟିଂ: ସର୍ବାଧିକ' },
  'search.found': { en: 'buses found', hi: 'बसें मिलीं', or: 'ବସ୍ ମିଳିଲା' },
  'search.selectSeats': { en: 'Select seats', hi: 'सीट चुनें', or: 'ସିଟ୍ ବାଛନ୍ତୁ' },
  'search.seatsLeft': { en: 'seats left', hi: 'सीटें बची', or: 'ସିଟ୍ ବଳିଛି' },
  'search.soldOut': { en: 'Sold out', hi: 'सोल्ड आउट', or: 'ସୋଲ୍ଡ ଆଉଟ୍' },

  'seats.title': { en: 'Choose your seats', hi: 'अपनी सीटें चुनें', or: 'ଆପଣଙ୍କ ସିଟ୍ ବାଛନ୍ତୁ' },
  'seats.subtitle': { en: 'Seats are held for 10 minutes once selected.', hi: 'चुनी गई सीटें 10 मिनट के लिए रोकी जाती हैं।', or: 'ବଛା ସିଟ୍ ୧୦ ମିନିଟ୍ ପାଇଁ ଧରି ରଖାଯାଏ।' },
  'seats.legendAvailable': { en: 'Available', hi: 'उपलब्ध', or: 'ଉପଲବ୍ଧ' },
  'seats.legendBooked': { en: 'Booked', hi: 'बुक', or: 'ବୁକ୍' },
  'seats.legendSelected': { en: 'Selected', hi: 'चयनित', or: 'ବଛା' },
  'seats.legendLadies': { en: 'Ladies seat', hi: 'महिला सीट', or: 'ମହିଳା ସିଟ୍' },
  'seats.lowerDeck': { en: 'Lower deck', hi: 'निचला डेक', or: 'ତଳ ଡେକ୍' },
  'seats.upperDeck': { en: 'Upper deck', hi: 'ऊपरी डेक', or: 'ଉପର ଡେକ୍' },
  'seats.fareSummary': { en: 'Fare summary', hi: 'किराया सारांश', or: 'ଭାଡ଼ା ସାରାଂଶ' },
  'seats.baseFare': { en: 'Base fare', hi: 'मूल किराया', or: 'ମୂଳ ଭାଡ଼ା' },
  'seats.continue': { en: 'Continue to passenger details', hi: 'यात्री विवरण पर जाएं', or: 'ଯାତ୍ରୀ ବିବରଣୀକୁ ଯାଆନ୍ତୁ' },
  'seats.holdNote': { en: 'Price is calculated automatically from the seats you pick.', hi: 'चुनी गई सीटों से किराया अपने आप जुड़ता है।', or: 'ବଛା ସିଟ୍ ଅନୁସାରେ ଭାଡ଼ା ସ୍ୱୟଂ ଗଣନା ହୁଏ।' },
  'seats.selectAtLeast': { en: 'Select at least one seat to continue.', hi: 'आगे बढ़ने के लिए कम से कम एक सीट चुनें।', or: 'ଆଗକୁ ବଢ଼ିବା ପାଇଁ ଅତି କମରେ ଏକ ସିଟ୍ ବାଛନ୍ତୁ।' },
  'seats.maxSeats': { en: 'You can book up to 6 seats per transaction.', hi: 'एक बार में अधिकतम 6 सीटें बुक कर सकते हैं।', or: 'ଏକ ସମୟରେ ସର୍ବାଧିକ ୬ ସିଟ୍ ବୁକ୍ କରିପାରିବେ।' },
  'seats.steering': { en: 'Driver', hi: 'चालक', or: 'ଚାଳକ' },

  'booking.passengerTitle': { en: 'Passenger details', hi: 'यात्री विवरण', or: 'ଯାତ୍ରୀ ବିବରଣୀ' },
  'booking.passengerSubtitle': { en: 'Names should match the ID carried on board.', hi: 'नाम बोर्ड पर दिखाए जाने वाले आईडी से मेल खाना चाहिए।', or: 'ନାମ ବୋର୍ଡରେ ଦେଖାଯିବା ଆଇଡି ସହିତ ମେଳ ଖାଇବା ଉଚିତ।' },
  'booking.leadContact': { en: 'Contact details', hi: 'संपर्क विवरण', or: 'ଯୋଗାଯୋଗ ବିବରଣୀ' },
  'booking.summary': { en: 'Booking summary', hi: 'बुकिंग सारांश', or: 'ବୁକିଂ ସାରାଂଶ' },
  'booking.continuePayment': { en: 'Continue to payment', hi: 'भुगतान पर जाएं', or: 'ଦେୟକୁ ଯାଆନ୍ତୁ' },
  'booking.agree': { en: 'I agree to the terms and the cancellation policy.', hi: 'मैं नियम और रद्दीकरण नीति से सहमत हूं।', or: 'ମୁଁ ନିୟମ ଏବଂ ବାତିଲ୍ ନୀତି ସହିତ ସହମତ।' },
  'booking.tripDetails': { en: 'Trip details', hi: 'यात्रा विवरण', or: 'ଯାତ୍ରା ବିବରଣୀ' },
  'booking.boarding': { en: 'Boarding point', hi: 'बोर्डिंग पॉइंट', or: 'ବୋର୍ଡିଂ ପଏଣ୍ଟ' },
  'booking.dropping': { en: 'Dropping point', hi: 'ड्रॉपिंग पॉइंट', or: 'ଡ୍ରପିଂ ପଏଣ୍ଟ' },

  'payment.title': { en: 'Secure payment', hi: 'सुरक्षित भुगतान', or: 'ସୁରକ୍ଷିତ ଦେୟ' },
  'payment.subtitle': { en: 'Pay by UPI, debit card, credit card or net banking.', hi: 'यूपीआई, डेबिट कार्ड, क्रेडिट कार्ड या नेट बैंकिंग से भुगतान करें।', or: 'ୟୁପିଆଇ, ଡେବିଟ୍ କାର୍ଡ, କ୍ରେଡିଟ୍ କାର୍ଡ କିମ୍ବା ନେଟ୍ ବ୍ୟାଙ୍କିଂରେ ଦେୟ ଦିଅନ୍ତୁ।' },
  'payment.payNow': { en: 'Pay now', hi: 'अभी भुगतान करें', or: 'ବର୍ତ୍ତମାନ ଦେୟ ଦିଅନ୍ତୁ' },
  'payment.secure': { en: 'Payments are processed by Razorpay and verified on our server.', hi: 'भुगतान Razorpay द्वारा होता है और हमारे सर्वर पर सत्यापित होता है।', or: 'ଦେୟ Razorpay ଦ୍ୱାରା ହୁଏ ଏବଂ ଆମ ସର୍ଭରରେ ଯାଞ୍ଚ ହୁଏ।' },
  'payment.notConfigured': { en: 'Online payments are being set up', hi: 'ऑनलाइन भुगतान सेट हो रहा है', or: 'ଅନଲାଇନ୍ ଦେୟ ସେଟ୍ ହେଉଛି' },
  'payment.notConfiguredBody': { en: 'Your seats are held. Add Razorpay keys to accept payments and confirm this booking.', hi: 'आपकी सीटें रोकी गई हैं। भुगतान स्वीकार करने के लिए Razorpay कुंजी जोड़ें।', or: 'ଆପଣଙ୍କ ସିଟ୍ ଧରି ରଖାଯାଇଛି। ଦେୟ ନେବା ପାଇଁ Razorpay କୀ ଯୋଡ଼ନ୍ତୁ।' },
  'payment.coupon': { en: 'Coupon code', hi: 'कूपन कोड', or: 'କୁପନ୍ କୋଡ୍' },
  'payment.couponApplied': { en: 'Coupon applied', hi: 'कूपन लागू हुआ', or: 'କୁପନ୍ ଲାଗୁ ହେଲା' },
  'payment.amountPayable': { en: 'Amount payable', hi: 'देय राशि', or: 'ଦେୟ ରାଶି' },

  'confirmation.title': { en: 'Booking confirmed', hi: 'बुकिंग पक्की', or: 'ବୁକିଂ ନିଶ୍ଚିତ' },
  'confirmation.subtitle': { en: 'Your e-ticket is ready. We have emailed a copy to you.', hi: 'आपका ई-टिकट तैयार है। एक प्रति ईमेल की गई है।', or: 'ଆପଣଙ୍କ ଇ-ଟିକେଟ୍ ପ୍ରସ୍ତୁତ। ଏକ ପ୍ରତିଲିପି ଇମେଲ୍ କରାଯାଇଛି।' },
  'confirmation.bookingId': { en: 'Booking ID', hi: 'बुकिंग आईडी', or: 'ବୁକିଂ ଆଇଡି' },
  'confirmation.download': { en: 'Download e-ticket', hi: 'ई-टिकट डाउनलोड करें', or: 'ଇ-ଟିକେଟ୍ ଡାଉନଲୋଡ୍ କରନ୍ତୁ' },
  'confirmation.viewBookings': { en: 'Go to my bookings', hi: 'मेरी बुकिंग देखें', or: 'ମୋ ବୁକିଂକୁ ଯାଆନ୍ତୁ' },
  'confirmation.whatNext': { en: 'Reach your boarding point 15 minutes early with a valid photo ID.', hi: 'वैध फोटो आईडी के साथ 15 मिनट पहले बोर्डिंग पॉइंट पहुंचें।', or: 'ବୈଧ ଫଟୋ ଆଇଡି ସହିତ ୧୫ ମିନିଟ୍ ପୂର୍ବରୁ ବୋର୍ଡିଂ ପଏଣ୍ଟରେ ପହଞ୍ଚନ୍ତୁ।' },

  'bookings.title': { en: 'My bookings', hi: 'मेरी बुकिंग', or: 'ମୋ ବୁକିଂ' },
  'bookings.upcoming': { en: 'Upcoming', hi: 'आगामी', or: 'ଆଗାମୀ' },
  'bookings.completed': { en: 'Completed', hi: 'पूर्ण', or: 'ସମ୍ପୂର୍ଣ୍ଣ' },
  'bookings.cancelled': { en: 'Cancelled', hi: 'रद्द', or: 'ବାତିଲ୍' },
  'bookings.empty': { en: 'No bookings here yet.', hi: 'अभी कोई बुकिंग नहीं।', or: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ବୁକିଂ ନାହିଁ।' },
  'bookings.cancelBooking': { en: 'Cancel booking', hi: 'बुकिंग रद्द करें', or: 'ବୁକିଂ ବାତିଲ୍ କରନ୍ତୁ' },
  'bookings.cancelNote': { en: 'Refunds follow the cancellation policy shown on the booking.', hi: 'रिफंड बुकिंग पर दिखाई गई रद्दीकरण नीति के अनुसार होगा।', or: 'ରିଫଣ୍ଡ ବୁକିଂରେ ଦେଖାଯାଇଥିବା ବାତିଲ୍ ନୀତି ଅନୁସାରେ ହେବ।' },

  'account.title': { en: 'My account', hi: 'मेरा खाता', or: 'ମୋ ଖାତା' },
  'account.profile': { en: 'Profile', hi: 'प्रोफ़ाइल', or: 'ପ୍ରୋଫାଇଲ୍' },
  'account.changePassword': { en: 'Change password', hi: 'पासवर्ड बदलें', or: 'ପାସୱାର୍ଡ ବଦଳାନ୍ତୁ' },
  'account.payments': { en: 'Payment history', hi: 'भुगतान इतिहास', or: 'ଦେୟ ଇତିହାସ' },
  'account.currentPassword': { en: 'Current password', hi: 'वर्तमान पासवर्ड', or: 'ବର୍ତ୍ତମାନ ପାସୱାର୍ଡ' },
  'account.newPassword': { en: 'New password', hi: 'नया पासवर्ड', or: 'ନୂଆ ପାସୱାର୍ଡ' },
  'account.update': { en: 'Update profile', hi: 'प्रोफ़ाइल अपडेट करें', or: 'ପ୍ରୋଫାଇଲ୍ ଅପଡେଟ୍ କରନ୍ତୁ' },

  'footer.tagline': { en: 'Odisha’s online bus booking platform.', hi: 'ओडिशा का ऑनलाइन बस बुकिंग प्लेटफ़ॉर्म।', or: 'ଓଡ଼ିଶାର ଅନଲାଇନ୍ ବସ୍ ବୁକିଂ ପ୍ଲାଟଫର୍ମ।' },
  'footer.company': { en: 'Company', hi: 'कंपनी', or: 'କମ୍ପାନୀ' },
  'footer.support': { en: 'Support', hi: 'सहायता', or: 'ସହାୟତା' },
  'footer.legal': { en: 'Legal', hi: 'कानूनी', or: 'ଆଇନଗତ' },
  'footer.rights': { en: 'All rights reserved.', hi: 'सर्वाधिकार सुरक्षित।', or: 'ସମସ୍ତ ଅଧିକାର ସୁରକ୍ଷିତ।' },

  'auth.loginTitle': { en: 'Sign in to your account', hi: 'अपने खाते में साइन इन करें', or: 'ଆପଣଙ୍କ ଖାତାରେ ସାଇନ୍ ଇନ୍ କରନ୍ତୁ' },
  'auth.registerTitle': { en: 'Create your account', hi: 'अपना खाता बनाएं', or: 'ଆପଣଙ୍କ ଖାତା ଖୋଲନ୍ତୁ' },
  'auth.haveAccount': { en: 'Already have an account?', hi: 'पहले से खाता है?', or: 'ପୂର୍ବରୁ ଖାତା ଅଛି?' },
  'auth.noAccount': { en: 'New to Utkal Yatra?', hi: 'Utkal Yatra पर नए हैं?', or: 'Utkal Yatra ରେ ନୂଆ?' },
  'auth.signIn': { en: 'Sign in', hi: 'साइन इन', or: 'ସାଇନ୍ ଇନ୍' },
  'auth.createAccount': { en: 'Create account', hi: 'खाता बनाएं', or: 'ଖାତା ଖୋଲନ୍ତୁ' },
};

type I18nValue = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };
const I18nContext = createContext<I18nValue>({ lang: 'en', setLang: () => undefined, t: (k) => D[k]?.en ?? k });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('uy_lang') as Lang | null;
    return stored && ['en', 'hi', 'or'].includes(stored) ? stored : 'en';
  });

  useEffect(() => {
    localStorage.setItem('uy_lang', lang);
    document.documentElement.lang = lang === 'or' ? 'or' : lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const t = useCallback((key: string) => D[key]?.[lang] ?? D[key]?.en ?? key, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export const LANGUAGES: Array<{ code: Lang; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'or', label: 'ଓଡ଼ିଆ' },
];
