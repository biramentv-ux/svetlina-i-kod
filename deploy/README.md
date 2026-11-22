# Светлина и код – безплатна школа на български

Цялата школа е **един HTML файл** (`index.html`) без сървър, база данни и външни зависимости.
Напредъкът на всеки ученик се пази само в неговия браузър (localStorage).

## Качване (изберете един вариант)

### GitHub Pages (автоматично от хранилището)
Хранилището `biramentv-ux/svetlina-i-kod` съдържа `.github/workflows/deploy.yml`, който при всеки push в `main` сглобява школата и я публикува.
1. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Направи push (или пусни workflow-а ръчно от раздела Actions).
3. Сайтът е на `https://biramentv-ux.github.io/svetlina-i-kod/`.

Лимити: сайт до 1 GB, мек лимит 100 GB трафик на месец.

### Cloudflare Pages (безплатно)
1. dash.cloudflare.com → Workers & Pages → Create → Pages → „Upload assets“.
2. Качете папката с `index.html`.
3. Получавате адрес `https://<име>.pages.dev`, може да вържете и собствен домейн.

Лимити: до 25 MiB на файл (школата е около 4–5 MB), до 20 000 файла, 500 билда на месец.

### Netlify / Vercel
И двете приемат качване на папка с плъзгане. Проверете условията на безплатния план преди публикуване.

### Собствен хостинг (напр. Hostinger, cPanel)
Качете `index.html` в `public_html` чрез файловия мениджър или FTP.

### Без интернет
Файлът работи и локално – отваря се с двойно щракване от компютър или USB.
Само вградените видеа изискват интернет.


## Собствен домейн: shkola.dyrakarmy.eu (настроен)
Школата се обслужва от GitHub Pages на **https://shkola.dyrakarmy.eu/**. DNS на dyrakarmy.eu е в Cloudflare.

| Запис в Cloudflare | Тип | Стойност | Защо |
|---|---|---|---|
| `shkola` | CNAME | `biramentv-ux.github.io` (DNS only, сив облак) | насочва поддомейна към GitHub Pages; без прокси, за да издаде GitHub HTTPS сертификат |
| `_github-pages-challenge-biramentv-ux` | TXT | код от GitHub | доказва, че домейнът е твой (Verified domain) – никой друг не може да го вземе в GitHub Pages |
| `_dnslink.shkola` | TXT | `dnslink=/ipfs/<CID>` | постоянен адрес на школата в IPFS |

В хранилището: Settings → Pages → Custom domain = `shkola.dyrakarmy.eu`, Enforce HTTPS – включено.
Не включвай оранжевия облак (Proxied) за `shkola`, иначе подновяването на сертификата в GitHub спира.
Hugging Face Space остава като резервно копие на адрес `huggingface.co/spaces/DyrakArmy/svetlina-i-kod`.

## Преди публикуване
- Прегледайте уроците за конкретни програми спрямо текущите им версии.
- Добавете страница или бележка за поверителност (школата не събира данни, но е добре да е написано).


## IPFS – p2p хостинг
IPFS адресира файловете по съдържание: всяка версия на школата има собствен **CID**, а всеки възел, който я пази (закача – pin), може да я раздава на останалите. Няма централен сървър, който да падне.

### 1. CID от GitHub Actions
Workflow-ът пресмята CID и CAR файл (`build.car`) при всяко сглобяване. CID-ът е в обобщението на изпълнението (Actions → последното изпълнение → Summary), а CAR файлът – в artifacts.

### 2. Закачане (pin) – поне един възел трябва да пази файла
- **Собствен компютър (най-p2p вариантът):** инсталирай IPFS Desktop или Kubo, свали `build.car` и го внеси с `ipfs dag import build.car`, или директно `ipfs add -r site/` от сглобения файл. Докато компютърът е онлайн, той раздава школата.
- **Собствен Kubo сървър:** задай в хранилището тайните `KUBO_API_URL` и `KUBO_API_AUTH` (Settings → Secrets and variables → Actions) – workflow-ът ще закача автоматично всяка версия.
- **Услуга за закачане** (Pinata, Filebase, Storacha и др.): качи `build.car` през техния интерфейс. Провери условията на безплатния им план.

Добре е да има поне два независими възела, иначе при изключване на единствения файлът спира да е достъпен.

### 3. Отваряне
- Браузър с IPFS (напр. Brave) или IPFS Desktop: `ipfs://<CID>`
- През публичен шлюз: `https://<CID>.ipfs.dweb.link/`

### 4. Постоянен адрес чрез DNSLink
CID се сменя с всяка версия. За постоянен адрес добави при регистратора TXT запис:

| Тип | Име | Стойност |
|---|---|---|
| TXT | `_dnslink.shkola` | `dnslink=/ipfs/<CID>` |

След това школата се отваря и като `ipns://shkola.dyrakarmy.eu`, и през шлюз като `https://shkola-dyrakarmy-eu.ipns.dweb.link/` (точките в домейна стават тирета). При нова версия смени само CID в TXT записа.
Записът `_dnslink` не пречи на CNAME записа `shkola` към Hugging Face – двата варианта работят едновременно.

Школата използва адреси с `#`, затова работи еднакво от IPFS шлюз, от поддиректория и от файл на диска.
