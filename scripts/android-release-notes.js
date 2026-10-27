#!/usr/bin/env node
/**
 * PuniCodex — Play Store release notes per locale.
 *
 * Emits android/release-notes/<version>/<play-locale>.txt for every targeted
 * Play Console locale, from one embedded translation map. Play caps release
 * notes at 500 chars — the script hard-fails any note over the limit.
 *
 * Usage: node scripts/android-release-notes.js <versionName> [versionCode]
 *   e.g. node scripts/android-release-notes.js 1.3.18 32
 *
 * To add a locale: add its Play Console locale code + translation to NOTES.
 * To release: run, then paste each file into Play Console → Release →
 * Production → "What's new in this release?" per locale (or use the Play
 * Developer API with these files).
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const LIMIT = 500;

// locale (Play Console code) → release notes. English is the master; every
// translation mirrors the same five bullets. Long-tail locales should get a
// native-speaker glance before submission.
const NOTES = {
  'en-US': `🎉 The first production release of PUNICODEX!
The Unicode keyboard for the world's original scripts.
• New gold emblem icon and splash screens
• Sponsorship flow hardened end-to-end
• Oracle keyboard training package added
• Mobile menu navigation fixed
• Lexicon refreshed: 980 scholarly name restorations`,
  'en-GB': `🎉 The first production release of PUNICODEX!
The Unicode keyboard for the world's original scripts.
• New gold emblem icon and splash screens
• Sponsorship flow hardened end-to-end
• Oracle keyboard training package added
• Mobile menu navigation fixed
• Lexicon refreshed: 980 scholarly name restorations`,
  'en-AU': `🎉 The first production release of PUNICODEX!
The Unicode keyboard for the world's original scripts.
• New gold emblem icon and splash screens
• Sponsorship flow hardened end-to-end
• Oracle keyboard training package added
• Mobile menu navigation fixed
• Lexicon refreshed: 980 scholarly name restorations`,
  'en-CA': `🎉 The first production release of PUNICODEX!
The Unicode keyboard for the world's original scripts.
• New gold emblem icon and splash screens
• Sponsorship flow hardened end-to-end
• Oracle keyboard training package added
• Mobile menu navigation fixed
• Lexicon refreshed: 980 scholarly name restorations`,
  'en-IN': `🎉 The first production release of PUNICODEX!
The Unicode keyboard for the world's original scripts.
• New gold emblem icon and splash screens
• Sponsorship flow hardened end-to-end
• Oracle keyboard training package added
• Mobile menu navigation fixed
• Lexicon refreshed: 980 scholarly name restorations`,
  'en-ZA': `🎉 The first production release of PUNICODEX!
The Unicode keyboard for the world's original scripts.
• New gold emblem icon and splash screens
• Sponsorship flow hardened end-to-end
• Oracle keyboard training package added
• Mobile menu navigation fixed
• Lexicon refreshed: 980 scholarly name restorations`,
  'de-DE': `🎉 Die erste Produktionsversion von PUNICODEX!
Die Unicode-Tastatur für die Originalschriften der Welt.
• Neues Wappen-Symbol und neue Startbildschirme in Gold
• Sponsoring-Ablauf durchgehend gehärtet
• Oracle-Tastaturtraining hinzugefügt
• Navigation im mobilen Menü repariert
• Lexikon aktualisiert: 980 wissenschaftliche Namensrestaurierungen`,
  'fr-FR': `🎉 Première version de production de PUNICODEX !
Le clavier Unicode pour les écritures originales du monde.
• Nouvelle icône et nouveaux écrans de démarrage à l'emblème doré
• Parcours de parrainage renforcé de bout en bout
• Pack d'entraînement Oracle pour le clavier
• Navigation du menu mobile corrigée
• Lexique actualisé : 980 restaurations savantes`,
  'fr-CA': `🎉 Première version de production de PUNICODEX !
Le clavier Unicode pour les écritures originales du monde.
• Nouvelle icône et nouveaux écrans de démarrage à l'emblème doré
• Parcours de parrainage renforcé de bout en bout
• Pack d'entraînement Oracle pour le clavier
• Navigation du menu mobile corrigée
• Lexique actualisé : 980 restaurations savantes`,
  'es-ES': `🎉 ¡Primera versión de producción de PUNICODEX!
El teclado Unicode para los sistemas de escritura originales del mundo.
• Nuevo icono y pantallas de inicio con el emblema dorado
• Flujo de patrocinio endurecido de extremo a extremo
• Pack de entrenamiento Oracle para el teclado
• Corregida la navegación del menú móvil
• Léxico actualizado: 980 restauraciones académicas`,
  'es-US': `🎉 ¡Primera versión de producción de PUNICODEX!
El teclado Unicode para los sistemas de escritura originales del mundo.
• Nuevo icono y pantallas de inicio con el emblema dorado
• Flujo de patrocinio reforzado de principio a fin
• Pack de entrenamiento Oracle para el teclado
• Corregida la navegación del menú móvil
• Léxico actualizado: 980 restauraciones académicas`,
  'pt-BR': `🎉 Primeira versão de produção do PUNICODEX!
O teclado Unicode para os sistemas de escrita originais do mundo.
• Novo ícone e telas de abertura com o emblema dourado
• Fluxo de patrocínio reforçado de ponta a ponta
• Pacote de treinamento Oracle para o teclado
• Navegação do menu mobile corrigida
• Léxico atualizado: 980 restaurações acadêmicas`,
  'pt-PT': `🎉 Primeira versão de produção do PUNICODEX!
O teclado Unicode para os sistemas de escrita originais do mundo.
• Novo ícone e ecrãs iniciais com o emblema dourado
• Fluxo de patrocínio reforçado de ponta a ponta
• Pacote de treino Oracle para o teclado
• Navegação do menu móvel corrigida
• Léxico atualizado: 980 restaurações académicas`,
  'it-IT': `🎉 La prima versione di produzione di PUNICODEX!
La tastiera Unicode per i sistemi di scrittura originali del mondo.
• Nuova icona e schermate di avvio con l'emblema dorato
• Flusso di sponsorizzazione rafforzato a fondo
• Pacchetto di allenamento Oracle per la tastiera
• Corretta la navigazione del menu mobile
• Lessico aggiornato: 980 restaurazioni accademiche`,
  'nl-NL': `🎉 De eerste productieversie van PUNICODEX!
Het Unicode-toetsenbord voor de oorspronkelijke schriften van de wereld.
• Nieuw gouden embleem-pictogram en startschermen
• Sponsorflow van begin tot eind versterkt
• Oracle-toetsenbordtrainingspakket toegevoegd
• Navigatie in het mobiele menu gerepareerd
• Lexicon vernieuwd: 980 geleerde naamherstellingen`,
  'sv-SE': `🎉 Första produktionsversionen av PUNICODEX!
Unicode-tangentbordet för världens ursprungliga skriftsystem.
• Ny ikon och nya startsidor med guldemblemet
• Sponsorflödet förstärkt från början till slut
• Oracle-träningspaket för tangentbordet tillagt
• Navigeringen i mobilmenyn åtgärdad
• Lexikon uppdaterat: 980 vetenskapliga namnrestaureringar`,
  'da-DK': `🎉 Første produktionsversion af PUNICODEX!
Unicode-tastaturet til verdens originale skriftsystemer.
• Nyt ikon og nye startskærme med guldemblemet
• Sponsorflowet styrket fra start til slut
• Oracle-træningspakke til tastaturet tilføjet
• Navigationen i mobilmenuen rettet
• Leksikon opdateret: 980 videnskabelige navnerestaureringer`,
  'no-NO': `🎉 Første produksjonsversjon av PUNICODEX!
Unicode-tastaturet for verdens opprinnelige skriftsystemer.
• Nytt ikon og nye oppstartsbilder med gullembledet
• Sponsorflyten styrket ende til ende
• Oracle-treningspakke for tastaturet lagt til
• Navigasjonen i mobilmenyen rettet
• Leksikon oppdatert: 980 vitenskapelige navnerestaureringer`,
  'fi-FI': `🎉 PUNICODEXin ensimmäinen tuotantoversio!
Unicode-näppäimistö maailman alkuperäisille kirjoitusjärjestelmille.
• Uusi kultaisen tunnuksen kuvake ja aloitusnäytöt
• Sponsorointivirta vahvistettu päästä päähän
• Oraclen näppäimistöharjoituspaketti lisätty
• Mobiilivalikon navigointi korjattu
• Lexikon päivitetty: 980 tieteellistä nimien palautusta`,
  'pl-PL': `🎉 Pierwsza wersja produkcyjna PUNICODEX!
Klawiatura Unicode dla pierwotnych systemów pisma świata.
• Nowa ikona i ekrany startowe ze złotym emblematem
• Przepływ sponsoringu wzmocniony od A do Z
• Pakiet treningowy Oracle dla klawiatury
• Naprawiona nawigacja w menu mobilnym
• Zaktualizowany leksykon: 980 akademickich rekonstrukcji nazw`,
  'cs-CZ': `🎉 První produkční verze PUNICODEXU!
Klávesnice Unicode pro původní písma světa.
• Nová ikona a úvodní obrazovky se zlatým emblémem
• Tok sponzoringu zabezpečen od začátku do konce
• Přidán tréninkový balíček Oracle pro klávesnici
• Opravena navigace v mobilní nabídce
• Aktualizovaný lexikon: 980 odborných rekonstrukcí jmen`,
  'sk': `🎉 Prvá produkčná verzia PUNICODEXU!
Klávesnica Unicode pre pôvodné písma sveta.
• Nová ikona a úvodné obrazovky so zlatým emblémom
• Tok sponzorstva posilnený od začiatku do konca
• Pridaný tréningový balíček Oracle pre klávesnicu
• Opravená navigácia v mobilnom menu
• Aktualizovaný lexikón: 980 odborných rekonštrukcií mien`,
  'sl': `🎉 Prva produkcijska različica PUNICODEXA!
Unicode tipkovnica za izvirna pisava sveta.
• Nova ikona in zagonski zasloni z zlatim emblemom
• Pot sponzorstva utrjena od začetka do konca
• Dodan vadbeni paket Oracle za tipkovnico
• Popravljena navigacija v mobilnem meniju
• Posodobljen leksikon: 980 znanstvenih rekonstrukcij imen`,
  'hu-HU': `🎉 A PUNICODEX első éles verziója!
A Unicode-billentyűzet a világ eredeti írásrendszereihez.
• Új arany emblémás ikon és indítóképernyők
• A szponzorációs folyamat teljes körűen megerősítve
• Oracle billentyűzet-edzőcsomag hozzáadva
• A mobilmenü navigációja javítva
• Frissített lexikon: 980 tudományos név-visszaállítás`,
  'ro': `🎉 Prima versiune de producție PUNICODEX!
Tastatura Unicode pentru scrierile originale ale lumii.
• Pictogramă nouă și ecrane de pornire cu emblema aurie
• Fluxul de sponsorizare consolidat cap-coadă
• Pachet de antrenament Oracle pentru tastatură
• Corectată navigarea în meniul mobil
• Lexicon actualizat: 980 de restaurări academice`,
  'bg': `🎉 Първото production издание на PUNICODEX!
Клавиатурата Unicode за оригиналните писмености на света.
• Нова икона и начални екрани със златния емблема
• Потокът на спонсорството е затвърден изцяло
• Добавен тренировъчен пакет Oracle за клавиатурата
• Поправена навигация в мобилното меню
• Обновен лексикон: 980 научни възстановявания на имена`,
  'sr': `🎉 Прва продукцијска верзија PUNICODEX-а!
Уникод тастатура за оригинална писма света.
• Нова икона и почетни екрани са златним грбом
• Ток спонзорства ојачан од почетка до краја
• Додат Oracle тренинг-пакет за тастатуру
• Поправљена навигација у мобилном менију
• Ажуриран лексикон: 980 научних реконструкција имена`,
  'el-GR': `🎉 Η πρώτη έκδοση παραγωγής του PUNICODEX!
Το πληκτρολόγιο Unicode για τα αυθεντικά συστήματα γραφής του κόσμου.
• Νέο εικονίδιο και οθόνες εκκίνησης με το χρυσό έμβλημα
• Η ροή χορηγίας ενισχύθηκε από άκρη σε άκρη
• Προστέθηκε πακέτο εκπαίδευσης Oracle για το πληκτρολόγιο
• Διορθώθηκε η πλοήγηση στο κινητό μενού
• Ανανεωμένο λεξικό: 980 ακαδημαϊκές αποκαταστάσεις ονομάτων`,
  'tr-TR': `🎉 PUNICODEX'in ilk yayın sürümü!
Dünyanın özgün yazı sistemleri için Unicode klavyesi.
• Yeni altın amblemli simge ve açılış ekranları
• Sponsorluk akışı uçtan uca güçlendirildi
• Oracle klavye eğitim paketi eklendi
• Mobil menü gezinmesi düzeltildi
• Sözlük güncellendi: 980 akademik isim restorasyonu`,
  'uk': `🎉 Перший production-реліз PUNICODEX!
Клавіатура Unicode для оригінальних письмових систем світу.
• Нова піктограма та стартові екрани з золотим емблемою
• Потік спонсорства зміцнено від початку до кінця
• Додано тренувальний пакет Oracle для клавіатури
• Виправлено навігацію в мобільному меню
• Оновлено лексикон: 980 наукових реставрацій імен`,
  'ru-RU': `🎉 Первый релиз PUNICODEX в продакшене!
Клавиатура Unicode для исконных письменностей мира.
• Новая иконка и заставки с золотым гербом
• Процесс спонсорства усилен от начала до конца
• Добавлен тренировочный пакет Oracle для клавиатуры
• Исправлена навигация в мобильном меню
• Обновлён лексикон: 980 академических реконструкций имён`,
  'zh-CN': `🎉 PUNICODEX 首个正式版！
为世界各地原生文字打造的 Unicode 键盘。
• 全新金色徽标图标与启动画面
• 赞助流程全线加固
• 新增 Oracle 键盘训练包
• 修复移动端菜单导航
• 词库更新：980 个学术性名称复原`,
  'zh-TW': `🎉 PUNICODEX 首個正式版！
為世界各地原生文字打造的 Unicode 鍵盤。
• 全新金色徽標圖示與啟動畫面
• 贊助流程全線加固
• 新增 Oracle 鍵盤訓練包
• 修復行動版選單導航
• 詞庫更新：980 個學術性名稱復原`,
  'zh-HK': `🎉 PUNICODEX 首個正式版！
為世界各地原生文字打造嘅 Unicode 鍵盤。
• 全新金色徽標圖示同啟動畫面
• 贊助流程全線加固
• 新增 Oracle 鍵盤訓練包
• 修復流動版選單導航
• 詞庫更新：980 個學術性名稱復原`,
  'ja-JP': `🎉 PUNICODEX 初の正式リリース！
世界の原初の文字体系のためのUnicodeキーボード。
• 新しい金色エンブレムのアイコンとスプラッシュ画面
• スポンサー導線を全体に強化
• Oracleキーボードトレーニングパックを追加
• モバイルメニューのナビゲーションを修正
• レキシコン更新：980件の学術的な名称復元`,
  'ko-KR': `🎉 PUNICODEX 첫 정식 출시!
전 세계 원문 문자 체계를 위한 유니코드 키보드.
• 새로운 금색 엠블럼 아이콘과 시작 화면
• 스폰서싱 흐름 전 구간 강화
• Oracle 키보드 훈련 패키지 추가
• 모바일 메뉴 탐색 수정
• 어휘집 업데이트: 980개의 학술적 명칭 복원`,
  'hi-IN': `🎉 PUNICODEX का पहला प्रोडक्शन संस्करण!
दुनिया की मौलिक लिपियों के लिए यूनिकोड कीबोर्ड।
• नया स्वर्ण प्रतीक आइकन और स्प्लैश स्क्रीन
• स्पॉन्सरशिप प्रवाह पूरी तरह मज़बूत किया गया
• कीबोर्ड के लिए Oracle ट्रेनिंग पैकेट जोड़ा गया
• मोबाइल मेनू नेविगेशन ठीक किया गया
• लेक्सिकन अपडेट: 980 विद्वत्तापूर्ण नाम-पुनरुद्धरण`,
  'bn': `🎉 PUNICODEX-এর প্রথম প্রোডাকশন সংস্করণ!
বিশ্বের মৌলিক লিপির জন্য ইউনিকোড কিবোর্ড।
• নতুন সোনালি প্রতীক আইকন ও স্প্ল্যাশ স্ক্রিন
• স্পনসরশিপ প্রবাহ সামগ্রিকভাবে শক্তিশালী করা হয়েছে
• কিবোর্ডের জন্য Oracle প্রশিক্ষণ প্যাকেজ যুক্ত
• মোবাইল মেনু নেভিগেশন ঠিক করা হয়েছে
• অভিধান আপডেট: ৯৮০টি শৈক্ষিক নাম-পুনরুদ্ধার`,
  'ta-IN': `🎉 PUNICODEX-இன் முதல் தயாரிப்பு பதிப்பு!
உலகின் அசல் எழுத்து முறைகளுக்கான Unicode விசைப்பலகை.
• புதிய தங்க எம்ப்ளம் ஐகான் மற்றும் துவக்க திரைகள்
• ஸ்பான்சர்ஷிப் ஓட்டம் முழுவதும் உறுதிப்படுத்தப்பட்டது
• விசைப்பலகைக்கான Oracle பயிற்சி தொகுப்பு சேர்க்கப்பட்டது
• மொபைல் மெனு வழிசெலுத்தல் சரிசெய்யப்பட்டது
• அகராதி புதுப்பிப்பு: 980 கல்வியறிவு பெயர் மீட்டமைப்புகள்`,
  'te-IN': `🎉 PUNICODEX యొక్క మొదటి ప్రొడక్షన్ వెర్షన్!
ప్రపంచపు మూల లిపుల కోసం Unicode కీబోర్డ్.
• కొత్త బంగారు ఎంబ్లమ్ ఐకాన్ మరియు స్ప్లాష్ స్క్రీన్లు
• స్పాన్సర్‌షిప్ ప్రవాహం అంతటా బలోపేతం చేయబడింది
• కీబోర్డ్ కోసం Oracle శిక్షణ ప్యాకేజీ జోడించబడింది
• మొబైల్ మెను న్యావిగేషన్ సరిచేయబడింది
• నిఘంటువు నవీకరణ: 980 విద్యాపరమైన పేరు పునరుద్ధరణలు`,
  'ml-IN': `🎉 PUNICODEX-ന്റെ ആദ്യത്തെ പ്രൊഡക്ഷൻ പതിപ്പ്!
ലോകത്തിലെ യഥാർത്ഥ ലിപികൾക്കുള്ള Unicode കീബോർഡ്.
• പുതിയ സ്വർണ്ണ എംബ്ലം ഐക്കണും സ്പ്ലാഷ് സ്ക്രീനുകളും
• സ്പോൺസർഷിപ്പ് ഒഴുക്ക് മൊത്തം ശക്തിപ്പെടുത്തി
• കീബോർഡിനുള്ള Oracle പരിശീലന പാക്കേജ് ചേർത്തു
• മൊബൈൽ മെനു നാവിഗേഷൻ ശരിയാക്കി
• ലെക്സിക്കൺ പുതുക്കി: 980 അക്കാദമിക് പേര് പുനഃസൃഷ്ടികൾ`,
  'kn-IN': `🎉 PUNICODEX ನ ಮೊದಲ ಪ್ರೊಡಕ್ಷನ್ ಆವೃತ್ತಿ!
ಜಗತ್ತಿನ ಮೂಲ ಲಿಪಿಗಳಿಗಾಗಿ Unicode ಕೀಬೋರ್ಡ್.
• ಹೊಸ ಚಿನ್ನದ ಲಾಂಛನ ಐಕಾನ್ ಮತ್ತು ಸ್ಪ್ಲಾಶ್ ಪರದೆಗಳು
• ಪ್ರಾಯೋಜಕತ್ವ ಹರಿವನ್ನು ಎಲ್ಲೆಡೆ ಬಲಪಡಿಸಲಾಗಿದೆ
• ಕೀಬೋರ್ಡ್‌ಗಾಗಿ Oracle ತರಬೇತಿ ಪ್ಯಾಕೇಜ್ ಸೇರಿಸಲಾಗಿದೆ
• ಮೊಬೈಲ್ ಮೆನು ನ್ಯಾವಿಗೇಶನ್ ಸರಿಪಡಿಸಲಾಗಿದೆ
• ಲೆಕ್ಸಿಕನ್ ನವೀಕರಣ: 980 ಶೈಕ್ಷಣಿಕ ಹೆಸರು ಪುನರ್ರಚನೆಗಳು`,
  'mr-IN': `🎉 PUNICODEX चे पहिले प्रोडक्शन आवृत्ती!
जगाच्या मूल लिपींसाठी Unicode कीबोर्ड.
• नवीन सुवर्ण चिन्ह आयकॉन आणि स्प्लॅश स्क्रीन
• प्रायोजकता प्रवाह संपूर्णपणे सुदृढ
• कीबोर्डसाठी Oracle प्रशिक्षण पॅकेज जोडले
• मोबाइल मेनू नेव्हिगेशन दुरुस्त
• लेक्सिकन अद्यतन: ९८० शैक्षणिक नावांचे पुनरुच्चार`,
  'gu-IN': `🎉 PUNICODEX નું પ્રથમ પ્રોડક્શન સંસ્કરણ!
વિશ્વની મૂળ લિપિઓ માટે Unicode કીબોર્ડ.
• નવો સુવર્ણ પ્રતીક આઇકોન અને સ્પ્લેશ સ્ક્રીનો
• સ્પોન્સરશિપ પ્રવાહ સંપૂર્ણપણે સુદૃઢ
• કીબોર્ડ માટે Oracle તાલીમ પેકેજ ઉમેરાયું
• મોબાઇલ મેનૂ નેવિગેશન સુધારાયું
• શબ્દકોશ અપડેટ: ૯૮૦ શૈક્ષણિક નામ પુનઃસ્થાપનો`,
  'pa-IN': `🎉 PUNICODEX ਦਾ ਪਹਿਲਾ ਪ੍ਰੋਡਕਸ਼ਨ ਵਰਜ਼ਨ!
ਦੁਨੀਆ ਦੀਆਂ ਮੂਲ ਲਿਪੀਆਂ ਲਈ Unicode ਕੀਬੋਰਡ।
• ਨਵਾਂ ਸੁਨਹਿਰੀ ਨਿਸ਼ਾਨ ਆਈਕਨ ਅਤੇ ਸਪਲੈਸ਼ ਸਕ੍ਰੀਨਾਂ
• ਸਪਾਂਸਰਸ਼ਿਪ ਵਹਾਅ ਪੂਰੀ ਤਰ੍ਹਾਂ ਮਜ਼ਬੂਤ
• ਕੀਬੋਰਡ ਲਈ Oracle ਟ੍ਰੇਨਿੰਗ ਪੈਕੇਜ ਜੋੜਿਆ
• ਮੋਬਾਈਲ ਮੀਨੂ ਨੇਵੀਗੇਸ਼ਨ ਠੀਕ ਕੀਤਾ
• ਲੈਕਸੀਕਨ ਅੱਪਡੇਟ: ੯੮੦ ਅਕਾਦਮਿਕ ਨਾਮ-ਪੁਨਰਸ੍ਰਿਸ਼ਟੀਆਂ`,
  'ne-NP': `🎉 PUNICODEX को पहिलो प्रोडक्सन संस्करण!
विश्वका मौलिक लिपिहरूका लागि Unicode किबोर्ड।
• नयाँ सुनौलो प्रतीक आइकन र स्प्लास स्क्रिनहरू
• स्पोन्सरसिप प्रवाह पूरै बलियो बनाइएको
• किबोर्डका लागि Oracle तालिम प्याकेज थपिएको
• मोबाइल मेनु नेभिगेसन ठीक गरिएको
• शब्दकोश अद्यावधिक: ९८० विद्वतापूर्ण नाम-पुनरुद्धार`,
  'ur': `🎉 PUNICODEX کا پہلا پروڈکشن ورژن!
دنیا کی اصل رسم الخط کے لیے یونی کوڈ کی بورڈ۔
• نیا سنہرے نشان والا آئیکن اور اسپلیش اسکرینز
• سپانسرشپ کے بہاؤ کو مکمل مضبوط کیا گیا
• کی بورڈ کے لیے Oracle تربیتی پیکج شامل
• موبائل مینیو نیویگیشن درست
• لغت اپ ڈیٹ: 980 علمی ناموں کی بحالی`,
  'ar': `🎉 الإصدار الأول من PUNICODEX للإنتاج!
لوحة مفاتيح يونيكود لكتابات العالم الأصلية.
• أيقونة وشاشات بدء جديدة بالشعار الذهبي
• تعزيز مسار الرعاية من البداية إلى النهاية
• إضافة حزمة تدريب Oracle للوحة المفاتيح
• إصلاح التنقل في القائمة الجوالة
• تحديث المعجم: 980 استعادة علمية للأسماء`,
  'fa': `🎉 نخستین نسخهٔ رسمی PUNICODEX!
صفحه‌کلید یونیکد برای خطوط اصیل جهان.
• آیکن و صفحه‌های آغازین جدید با نشان طلایی
• تقویت کامل جریان حمایت مالی
• افزودن بستهٔ تمرینی Oracle برای صفحه‌کلید
• رفع مشکل پیمایش منوی موبایل
• به‌روزرسانی فرهنگ: ۹۸۰ بازسازی دانشگاهی نام‌ها`,
  'iw-IL': `🎉 הגרסה הראשונה של PUNICODEX לייצור!
מקלדת Unicode לכתבים המקוריים של העולם.
• אייקון ומסכי פתיחה חדשים עם הסמל הזהב
• תהליך החסות חוזק מהתחלה ועד סוף
• נוספה חבילת אימון Oracle למקלדת
• תוקנה הניווט בתפריט הנייד
• לקסיקון מעודכן: 980 שחזורים אקדמיים של שמות`,
  'th': `🎉 PUNICODEX เวอร์ชันโปรดักชันแรก!
คีย์บอร์ด Unicode สำหรับระบบการเขียนดั้งเดิมของโลก
• ไอคอนและหน้าจอสแปลชใหม่พร้อมตราสัญลักษณ์สีทอง
• ปรับปรุงขั้นตอนการสนับสนุนตลอดทั้งกระบวนการ
• เพิ่มแพ็กเกจฝึกฝน Oracle สำหรับคีย์บอร์ด
• แก้ไขการนำทางเมนูมือถือ
• อัปเดตพจนานุกรม: การกู้คืนชื่อเชิงวิชาการ 980 รายการ`,
  'vi': `🎉 Bản phát hành production đầu tiên của PUNICODEX!
Bàn phím Unicode cho các hệ chữ nguyên bản của thế giới.
• Biểu tượng và màn hình khởi động mới với huy hiệu vàng
• Quy trình tài trợ được củng cố toàn diện
• Thêm gói luyện tập Oracle cho bàn phím
• Sửa điều hướng menu di động
• Cập nhật từ điển: 980 phục hồi tên học thuật`,
  'id': `🎉 Rilis produksi pertama PUNICODEX!
Papan ketik Unicode untuk aksara asli dunia.
• Ikon dan layar pembuka baru dengan lambang emas
• Alur sponsorship diperkuat sepenuhnya
• Paket pelatihan Oracle untuk papan ketik ditambahkan
• Navigasi menu seluler diperbaiki
• Leksikon diperbarui: 980 restorasi nama akademis`,
  'ms': `🎉 Keluaran produksi pertama PUNICODEX!
Papan kekunci Unicode untuk tulisan asli dunia.
• Ikon dan skrin pembuka baharu dengan lambang emas
• Aliran penajaan diperkukuh sepenuhnya
• Pakej latihan Oracle untuk papan kekunci ditambah
• Navigasi menu mudah alih dibaiki
• Leksikon dikemas kini: 980 pemulihan nama akademik`,
  'fil': `🎉 Ang unang production release ng PUNICODEX!
Ang Unicode keyboard para sa mga orihinal na sulat ng mundo.
• Bagong icon at splash screens na may gintong sagisag
• Pinalakas ang daloy ng sponsorship mula simula hanggang dulo
• Idinagdag ang Oracle training package para sa keyboard
• Ayos na ang navigasyon ng mobile menu
• Na-update ang leksikon: 980 akademikong pagpapanumbalik ng mga pangalan`,
  'sw': `🎉 Toleo la kwanza la uzalishaji la PUNICODEX!
Kibodi ya Unicode kwa maandishi asili ya dunia.
• Aikoni na skrini za kuanza mpya zenye nembo ya dhahabu
• Mtiririko wa ufadhili umeimarika kuanzia mwanzo hadi mwisho
• Kifurushi cha mafunzo cha Oracle kwa kibodi kimeongezwa
• Urambazaji wa menyu ya simu ume rekebishwa
• Msamiati umesasishwa: urekebishaji wa kitaaluma wa majina 980`,
  'zu': `🎉 Ukukhishwa kwangempela kokuqala kwe-PUNICODEX!
Ikhilobodi ye-Unicode wamabhalwane asemdeni.
• Isithonjana kanye lesikrini esinembeji yegolide
• Inzila yesekelo iqinisiwe
• Iphakheji lomsebenzi we-Oracle yekhilobodi
• Inkomba yomsebenzi yemenyu yefoni ilungisiwe
• Ishicilelwe: ukwamukeliswa kabusha kwamagama angu-980`,
};

function main() {
  const version = process.argv[2];
  if (!version) {
    console.error('Usage: node scripts/android-release-notes.js <versionName> [versionCode]');
    process.exit(1);
  }
  const code = process.argv[3] || '';
  const dir = path.join(ROOT, 'android', 'release-notes', version);
  fs.mkdirSync(dir, { recursive: true });

  let bad = 0;
  for (const [locale, note] of Object.entries(NOTES)) {
    if (note.length > LIMIT) {
      console.error(`✗ ${locale}: ${note.length} chars — over the ${LIMIT} limit`);
      bad++;
      continue;
    }
    fs.writeFileSync(path.join(dir, `${locale}.txt`), note + '\n');
  }
  if (bad) process.exit(1);

  const readme = `PUNICODEX ${version}${code ? ` (versionCode ${code})` : ''} — Play Store release notes
Paste each <locale>.txt into Play Console → Release → Production →
"What's new in this release?" for the matching locale.
Generated by scripts/android-release-notes.js — edit the map there.
`;
  fs.writeFileSync(path.join(dir, 'README.txt'), readme);
  console.log(`Wrote ${Object.keys(NOTES).length} locale files to android/release-notes/${version}/`);
  console.log('Long-tail translations should get a native-speaker glance before submission.');
}

main();
