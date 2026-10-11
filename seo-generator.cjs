const fs = require('fs');
const path = require('path');

const domain = 'https://showpayy.com';
const publicDir = path.join(__dirname, 'public');
const socialImage = `${domain}/showpay-logo.png`;

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

function writeIfChanged(filePath, content) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === content) {
    return false;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

const pages = [
  {
    filename: 'about-showpay.html',
    title: 'About ShowPay | App, Login and Payment Platform',
    description: 'Learn about ShowPay, its secure account login, mobile-friendly web app and available payment and wallet features.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      '@id': `${domain}/about-showpay.html#webpage`,
      url: `${domain}/about-showpay.html`,
      name: 'About ShowPay',
      description: 'Information about ShowPay account access, the web app and available payment features.',
      isPartOf: { '@type': 'WebSite', '@id': `${domain}/#website`, url: `${domain}/`, name: 'Showpay' }
    },
    body: `
      <h1>About ShowPay</h1>
      <p>Showpay is a mobile-friendly web application designed for account holders who want to access their payment dashboard quickly and securely. The official <strong>ShowPay login</strong> is available at <strong>showpayy.com</strong>, the only domain you should use to sign in to your Showpay account. This page explains what ShowPay offers, how the Showpay app works, and what to do if you need account assistance.</p>
      
      <h2>What is ShowPay?</h2>
      <p>Showpay—also written as "Show Pay" or searched as "Showpay"—is a web-based payment platform that gives registered users access to a personal account dashboard. Through the dashboard, users can view their account balance, access payment and wallet tools, review transaction history, and follow instructions provided for their account type. The platform is built to work on both desktop and mobile browsers, meaning you do not need to install a Showpay apk to use the core features.</p>

      <h2>How ShowPay account access works</h2>
      <p>To use the Show Pay Login, open the login page and enter the mobile number and password associated with your account. After a successful ShowPay login, the system may prompt you to enter a six-digit MPIN to confirm your identity before displaying your account dashboard. This two-step process helps protect your account from unauthorized access.</p>
      
      <h3>How to Use ShowPay Safely</h3>
      <ul>
        <li>Always confirm the address bar shows <strong>showpayy.com</strong> before entering any account details for your Showpay login.</li>
        <li>Never share your password, OTP, MPIN, or recovery code with anyone.</li>
        <li>If you forget your password, use the Forget Password link shown on the Show Pay Login page to start the account recovery process. OTPs expire quickly and are only valid for the specific action requested.</li>
        <li>Create a new, stronger password that is unique to Showpay.</li>
        <li>Avoid saving credentials in shared browsers or on devices you do not control.</li>
      </ul>

      <h2>What features are available in ShowPay?</h2>
      <p>The specific features available after login depend on your account type and the current platform configuration. Generally, Showpay accounts provide access to a payment dashboard showing account balance information, transaction options, and any deposit or withdrawal tools enabled for your account. Some accounts may have access to Showpay USDT cryptocurrency features, while others may show different payment methods. Always check the current options displayed inside your signed-in dashboard rather than relying on information from an older screenshot or message.</p>
      <p>Read about <a href="/showpay-apk.html">Showpay app and APK access</a>, explore the <a href="/showpay-guide.html">Showpay guide hub</a>, or continue to the <a href="/">ShowPay login</a>.</p>
    `
  },
  {
    filename: 'showpay-apk.html',
    route: '/showpay-apk',
    title: 'ShowPay APK and App Access | ShowPay Login',
    description: 'Find safe Showpay app access information, sign in through the web login and avoid unverified Showpay apk download sources.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${domain}/showpay-apk#webpage`,
      url: `${domain}/showpay-apk`,
      name: 'ShowPay APK and App Access',
      description: 'Safe access information for the Showpay app, web login and APK-related searches.',
      isPartOf: { '@type': 'WebSite', '@id': `${domain}/#website`, url: `${domain}/`, name: 'ShowPay' }
    },
    body: `
      <h1>ShowPay App and APK Access</h1>
      <p>Many users search for a <strong>Showpay apk</strong> download to install the app on their Android phone. This page explains the safest way to access Showpay on mobile, why you should be careful with APK files from unknown sources, and how to use the official Showpay app without downloading any additional file.</p>
      
      <h2>The official Showpay mobile access method</h2>
      <p>The <strong>Showpay app</strong> is fully accessible through any current mobile browser. Open <strong>https://showpayy.com/</strong> in Chrome, Safari, Firefox, or any other browser installed on your Android or iOS device. The site automatically adjusts to fit your phone screen, providing a smooth, app-like experience without requiring an installation. Before entering any account details for a ShowPay login, confirm the address bar shows <strong>showpayy.com</strong> and not a variation or look-alike domain.</p>
      <p>This approach is the recommended and verified method for accessing Showpay on a mobile device. Unlike an APK file you might receive through a message or find on a third-party website, the web app is always up to date and does not require device permissions beyond what your browser already has.</p>
      
      <h2>Adding Showpay to your phone home screen</h2>
      <p>If you want faster access to Showpay on your phone without going through your browser bookmarks each time, you can add the site to your home screen. This creates a shortcut that opens the web app in a full-screen view without browser toolbars. This is safer than installing a Showpay apk from an unknown source.</p>

      <h2>Risks of unverified Showpay apk files</h2>
      <p>An APK file is an Android application package. While APKs are a legitimate way to distribute Android apps, files from unofficial sources carry serious risks. An APK claiming to be a Show Pay download could:</p>
      <ul>
        <li>Request permissions to access your contacts, camera, microphone, storage, or SMS messages unnecessarily.</li>
        <li>Contain malware designed to steal your Show Pay Login credentials, banking details, or other personal information.</li>
        <li>Display a fake Showpay interface that collects your mobile number, password, and MPIN and sends them to an attacker.</li>
      </ul>

      <p>For more details, read the <a href="/showpay-usdt.html">Showpay USDT guide</a>, or go to the <a href="/">Showpay login</a>.</p>
    `
  },
  {
    filename: 'showpay-usdt.html',
    route: '/showpay-usdt',
    title: 'ShowPay USDT Guide | Crypto Deposit and Network Safety',
    description: 'Learn how to verify USDT networks, check wallet addresses and track transaction status for Showpay cryptocurrency features.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${domain}/showpay-usdt#webpage`,
      url: `${domain}/showpay-usdt`,
      name: 'ShowPay USDT Guide',
      description: 'Important network and address verification steps for ShowPay USDT and cryptocurrency transactions.',
      isPartOf: { '@type': 'WebSite', '@id': `${domain}/#website`, url: `${domain}/`, name: 'ShowPay' }
    },
    body: `
      <h1>ShowPay USDT Guide</h1>
      <p>This comprehensive guide explains every check you should make before and after using a <strong>Showpay USDT</strong> feature available in your Showpay account. USDT (Tether) is a stablecoin that can be transferred on multiple blockchain networks. Because each network has different addresses, fees, and confirmation times, reading these checks carefully before making a transfer can prevent mistakes that are difficult or impossible to reverse.</p>
      
      <h2>How to Deposit on Showpay</h2>
      <p>Different users may see different deposit methods in their dashboards. Whether it is a bank transfer, UPI, or crypto, the following applies to all Showpay deposit methods:</p>
      <ul>
        <li>Open <a href="/">showpayy.com</a> and sign in using your Showpay login. Complete the MPIN step if prompted.</li>
        <li>Navigate to the deposit section of your dashboard. Only use a deposit option if it is currently displayed and active for your account.</li>
        <li><strong>Verify all details before confirming:</strong> Check the recipient details, minimum deposit amount, fees, and expiry time.</li>
        <li>Save your confirmation receipt or transaction ID (TXID). This reference is essential if you need to follow up on the deposit status.</li>
      </ul>

      <h2>Step-by-step: How to deposit USDT on ShowPay</h2>
      <p>Depositing <strong>Showpay USDT</strong> requires additional network and address verification:</p>
      <ol>
        <li>Note the network name shown on the Showpay deposit screen (e.g., TRC-20, ERC-20). In your sending wallet, choose the exact same network. A network mismatch can cause permanent loss of funds.</li>
        <li>Copy the destination wallet address from your Showpay deposit screen. Compare the full address—beginning, middle, and end—between what your wallet shows and what the Showpay screen shows.</li>
        <li>Check that your amount meets the minimum shown on the deposit screen, review fees, and confirm the transfer.</li>
      </ol>

      <h2>Checking Showpay USDT transaction status</h2>
      <p>Processing time can vary by network activity and the number of blockchain confirmations required by Showpay. After sending, use the public TXID from your wallet to look up the transaction on a blockchain explorer matching the network you used. Wait for the required confirmations before concluding there is a problem.</p>
      <p>If a Showpay USDT transaction is pending longer than expected, verify the TXID on an explorer, check that the destination address matched exactly, and confirm both sides used the same network. Do not send a second transfer until the first one is confirmed or rejected.</p>
      <p>For more information, go to the <a href="/showpay-guide.html">Showpay guides</a>.</p>
    `
  },
  {
    filename: 'showpay-guide.html',
    title: 'ShowPay Guides | Complete Help and Support Center',
    description: 'Find official ShowPay guides for account login, mobile app access, deposits, USDT transactions and password recovery.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${domain}/showpay-guide.html#webpage`,
      url: `${domain}/showpay-guide.html`,
      name: 'ShowPay Guides',
      description: 'A collection of ShowPay account, app, deposit, USDT and password-help guides.',
      about: { '@type': 'Organization', '@id': `${domain}/#organization`, name: 'ShowPay', alternateName: ['Showpay', 'Show pay'], url: `${domain}/` }
    },
    body: `
      <h1>ShowPay Guides Complete Help Center</h1>
      <p>Welcome to the <strong>Showpay guide hub</strong>. Whether you search for "Showpay," "Show Pay," or "Showpay login," this page brings together every public help article available at showpayy.com. Use the links below to find step-by-step instructions for account login, mobile app access, deposits, and Showpay USDT transactions.</p>
      
      <h2>All ShowPay help guides</h2>
      <ul>
        <li><a href="/about-showpay.html">About Showpay & How to Use It</a> - Learn the basic Show Pay Login process, password recovery, what the dashboard shows, and how to navigate your account safely.</li>
        <li><a href="/showpay-apk.html">Showpay app and APK access</a> - Understand the safest way to use Showpay on mobile and why unverified Showpay apk files carry risks.</li>
        <li><a href="/showpay-usdt.html">Showpay USDT & Deposit guide</a> - Comprehensive explanation of general deposits, Showpay USDT networks, transaction status, and what to do if a transfer is pending.</li>
      </ul>

      <h2>Showpay Customer Support & Safety</h2>
      <p>If you are unable to sign in using the Show Pay Login, confirm you are on <strong>showpayy.com</strong>, check your registered mobile number, and ensure your password is correct. If the issue continues, use the Forget Password option.</p>
      <p>For any Showpay transaction question, keep your public transaction ID ready. A genuine support process will never ask you to share your current password, MPIN, or OTP. It will not ask you to send funds to a new address to verify your account or unlock a feature.</p>
      
      <p>All the guides on this website follow the same safety principles. Before making any payment, deposit, or withdrawal, confirm you are signed in at <strong>showpayy.com</strong> and not a look-alike domain. Never share your password, OTP, MPIN, or recovery code with any person or website.</p>
    `
  }
];
const extendedContent = {
  'about-showpay.html': `
      <section class="content-section">
        <h2>What you can find on this website</h2>
        <p>showpayy.com brings the ShowPay login and public help guides together on one domain. The public pages explain account access, mobile use, deposits, USDT checks, password recovery and support. Features shown after login can vary by account, so the signed-in dashboard remains the place to confirm current options.</p>
        <div class="info-grid">
          <article class="info-card"><span class="card-icon">01</span><h3>Account access</h3><p>Open the verified ShowPay login, enter your own account details and use the recovery link when required.</p></article>
          <article class="info-card"><span class="card-icon">02</span><h3>Mobile-friendly app</h3><p>Use ShowPay through a current mobile browser without relying on an unverified APK or download link.</p></article>
          <article class="info-card"><span class="card-icon">03</span><h3>Practical guides</h3><p>Review task-focused instructions before using deposit, USDT or account-help features.</p></article>
        </div>
      </section>
      <section class="content-section">
        <h2>How ShowPay information stays useful</h2>
        <p>These pages avoid displaying private account data, fixed wallet addresses or promises about transaction availability. Instead, they explain what to verify on the live account screen. This matters because networks, limits, fees and enabled services can change.</p>
        <ul class="check-list"><li>Confirm the domain before signing in.</li><li>Use only features visible inside your own dashboard.</li><li>Read current on-screen amounts, fees and status messages.</li><li>Never share a password, OTP, MPIN or recovery code.</li></ul>
      </section>`,
  'showpay-apk.html': `
      <section class="content-section">
        <h2>ShowPay app access: web app or APK?</h2>
        <p>The current verified access on this domain is the mobile-friendly web application. It adapts to a phone screen and does not require a separate installation. If an official downloadable Android package becomes available, its publisher, version and permissions should be confirmed before installation.</p>
        <div class="comparison"><div><strong>Mobile web access</strong><span>Open showpayy.com in your browser</span></div><div><strong>Unknown APK file</strong><span>Avoid unless the source and publisher are verified</span></div></div>
      </section>
      <section class="content-section">
        <h2>Add ShowPay to your phone home screen</h2>
        <ol><li>Open the ShowPay login using a current mobile browser.</li><li>Confirm the address bar shows <strong>showpayy.com</strong>.</li><li>Open the browser menu and choose the available “Add to Home screen” option.</li><li>Use the new shortcut to return to the same verified web address.</li></ol>
        <p>This shortcut does not install an unknown APK and can be removed like any other home-screen shortcut.</p>
      </section>
      <section class="content-section"><h2>Common ShowPay APK questions</h2><h3>Does this page provide an APK download?</h3><p>No. This page provides safe access guidance and a direct link to the ShowPay web login.</p><h3>What if a message sends me an APK?</h3><p>Do not install it only because it uses the ShowPay name. Verify the publisher and source first, and avoid files requesting unnecessary permissions.</p></section>`,
  'showpay-support.html': `
      <section class="content-section">
        <h2>Choose the right help path</h2>
        <div class="info-grid"><article class="info-card"><h3>Cannot sign in</h3><p>Check the phone number, password and website address, then use the recovery option from the login page.</p></article><article class="info-card"><h3>Deposit is pending</h3><p>Review the dashboard status, payment reference or blockchain transaction ID before trying again.</p></article><article class="info-card"><h3>USDT question</h3><p>Confirm the network, complete address and required confirmations using the current account screen.</p></article></div>
      </section>
      <section class="content-section"><h2>Information to keep ready</h2><p>For a clear account or transaction enquiry, keep non-secret details such as the approximate time, displayed status and transaction reference ready. Never include your password, OTP, MPIN, recovery code or full private credentials in a support message.</p><ul class="check-list"><li>Take note of the exact error or status text.</li><li>Confirm whether the issue occurs before or after login.</li><li>For blockchain transfers, keep the public transaction ID.</li><li>Avoid sending the same payment again until its status is clear.</li></ul></section>
      <section class="content-section"><h2>Account safety reminder</h2><p>A genuine help process should not require your current password or MPIN. If someone asks you to transfer funds to “unlock” support, stop and verify the request through the information available inside your account.</p><p>Keep screenshots limited to the part that shows the error and hide phone numbers, balances, wallet addresses or other private details before sharing them. Clear information helps explain the issue without exposing the account.</p></section>`,
  'showpay-usdt.html': `
      <section class="content-section">
        <h2>USDT network matching explained</h2>
        <p>USDT can exist on more than one blockchain network. The network selected in the sending wallet must match the network shown in the ShowPay deposit option. A correct-looking address does not make a network mismatch safe. Always compare the network name and the complete destination address before confirming a transfer.</p>
        <div class="process"><div><b>1</b><span><strong>Open your account</strong>Use the verified ShowPay login.</span></div><div><b>2</b><span><strong>Match details</strong>Check network, address, amount and fee.</span></div><div><b>3</b><span><strong>Track status</strong>Keep the transaction ID and review confirmations.</span></div></div>
      </section>
      <section class="content-section"><h2>If a ShowPay USDT transaction is pending</h2><p>First check whether the sending wallet shows a completed transaction and whether the blockchain explorer shows confirmations. Then compare that information with the status in your account. Network congestion can delay confirmations, so repeating the transfer may create a second transaction rather than fixing the first.</p><ul class="check-list"><li>Verify the public transaction ID.</li><li>Check the destination address and selected network.</li><li>Review the number of blockchain confirmations.</li><li>Keep account secrets out of any support request.</li></ul></section>
      <section class="content-section"><h2>Important USDT safety checks</h2><p>Blockchain transactions may be irreversible. Do not use a wallet address copied from an old screenshot or an unknown chat. If the details displayed in your current account differ from an earlier instruction, pause and verify before sending.</p></section>`,
  'showpay-guide.html': `
      <section class="content-section"><h2>Start with the task you want to complete</h2><div class="guide-grid"><a href="/how-to-use-showpay.html"><strong>Use ShowPay</strong><span>Login and dashboard basics</span></a><a href="/showpay-apk"><strong>App &amp; APK</strong><span>Safe mobile access</span></a><a href="/how-to-deposit-showpay.html"><strong>Deposit guide</strong><span>General payment checks</span></a><a href="/showpay-usdt"><strong>USDT guide</strong><span>Network and address checks</span></a><a href="/showpay-password-help.html"><strong>Password help</strong><span>Recovery and account safety</span></a><a href="/showpay-support.html"><strong>Support</strong><span>Common issue guidance</span></a></div></section>
      <section class="content-section"><h2>How to use these ShowPay guides</h2><p>Begin with the guide matching your task, then use the blue ShowPay Login button when you are ready to access your account. The guides do not collect personal information and do not replace current instructions displayed inside the dashboard.</p><p>Searches may spell the name as ShowPay, Showpay or Show pay. The pages use the consistent brand spelling while answering the same account, app, deposit, USDT and password-help questions in natural language.</p></section>
      <section class="content-section"><h2>Before taking account action</h2><ul class="check-list"><li>Confirm you are on showpayy.com.</li><li>Read the complete current instruction.</li><li>Verify amounts, networks and destination details.</li><li>Do not share credentials with another person.</li><li>Check status before repeating a request or payment.</li></ul><p>Bookmark this guide hub if you regularly need help. Returning through one consistent page makes it easier to find the correct instructions and reduces the risk of following an outdated or unverified third-party link.</p></section>`,
  'how-to-use-showpay.html': `
      <section class="content-section"><h2>ShowPay first-time access checklist</h2><div class="process"><div><b>1</b><span><strong>Open</strong>Visit showpayy.com directly.</span></div><div><b>2</b><span><strong>Login</strong>Use your own registered details.</span></div><div><b>3</b><span><strong>Review</strong>Check the tools enabled for your account.</span></div></div><p>On a shared phone, avoid saving the password and sign out when you finish. On your own device, keep the browser and operating system updated.</p></section>
      <section class="content-section"><h2>Understanding the account dashboard</h2><p>After login, read the labels and status shown in the dashboard before selecting a feature. Availability can differ between accounts and can change over time. An older screenshot, video or message may not reflect the current workflow.</p><p>When an action involves a payment, wallet address or verification step, review every field before continuing. If the screen is unclear or a feature is unavailable, use the relevant public guide instead of guessing.</p></section>
      <section class="content-section"><h2>Using ShowPay safely on mobile</h2><ul class="check-list"><li>Check the domain every time you open a saved link.</li><li>Do not enter credentials after following an unknown message.</li><li>Never share OTP, MPIN or recovery information.</li><li>Review account activity and status after completing an action.</li></ul></section>`,
  'how-to-deposit-showpay.html': `
      <section class="content-section"><h2>Step-by-step ShowPay deposit checks</h2><div class="process"><div><b>1</b><span><strong>Select</strong>Open the deposit option shown in your dashboard.</span></div><div><b>2</b><span><strong>Verify</strong>Read method, amount and destination details.</span></div><div><b>3</b><span><strong>Confirm</strong>Complete the action once and keep its reference.</span></div></div></section>
      <section class="content-section"><h2>Before confirming a deposit</h2><p>Check whether the displayed method has a minimum amount, processing fee, expiry time or required payment reference. Entering incomplete information can delay account credit. Use only the instructions currently visible in your account.</p><ul class="check-list"><li>Confirm the selected payment or deposit method.</li><li>Check the complete recipient or wallet information.</li><li>Review minimum, maximum and fee details.</li><li>Save the payment or transaction reference.</li></ul></section>
      <section class="content-section"><h2>If the deposit status does not update</h2><p>Do not immediately send another payment. Compare your payment confirmation with the dashboard status and allow for the processing time shown. For a crypto transfer, check the blockchain transaction ID and network confirmations. Use the support guidance with non-secret transaction information if the issue continues.</p></section>`,
  'how-to-deposit-usdt-showpay.html': `
      <section class="content-section"><h2>USDT deposit verification flow</h2><div class="process"><div><b>1</b><span><strong>Choose network</strong>Use a network supported by both sides.</span></div><div><b>2</b><span><strong>Copy carefully</strong>Compare the complete destination address.</span></div><div><b>3</b><span><strong>Track transfer</strong>Keep the public transaction ID.</span></div></div></section>
      <section class="content-section"><h2>Why the network matters</h2><p>A token with the same USDT name can be transferred on different networks. The sender and receiver must use the same supported network. Fees, processing time and required confirmations can also differ. Never choose a network only because it has the lowest fee unless the receiving screen explicitly supports it.</p></section>
      <section class="content-section"><h2>After sending USDT</h2><p>Use the transaction ID to check whether the blockchain has confirmed the transfer. A wallet showing “sent” does not always mean the receiving platform has completed its own confirmation process. Wait for the required confirmations and monitor the account status before trying another transfer.</p><ul class="check-list"><li>Sender and ShowPay network match.</li><li>Full wallet address matches.</li><li>Amount meets any displayed minimum.</li><li>Transaction ID is saved for status checks.</li></ul></section>`,
  'showpay-password-help.html': `
      <section class="content-section"><h2>Safe ShowPay password recovery steps</h2><div class="process"><div><b>1</b><span><strong>Start correctly</strong>Open recovery from the main login page.</span></div><div><b>2</b><span><strong>Verify</strong>Follow only the on-screen recovery process.</span></div><div><b>3</b><span><strong>Return</strong>Sign in again at showpayy.com.</span></div></div></section>
      <section class="content-section"><h2>Create a stronger new password</h2><p>Use a password that is unique to ShowPay and difficult to guess. Avoid your name, phone number, birth date or a password already used on another website. Store it in a trusted password manager rather than sending it to yourself in an unprotected message.</p><ul class="check-list"><li>Use a long, unique password.</li><li>Do not share verification codes.</li><li>Check the website address during recovery.</li><li>Review the account after signing back in.</li></ul></section>
      <section class="content-section"><h2>Recovery messages to avoid</h2><p>Ignore anyone who asks for your current password, OTP, MPIN or a payment to unlock the account. Do not install remote-access software for password help. If the official recovery flow is unavailable, record the visible error and use the support guidance without disclosing secret credentials.</p></section>`,
};

const styles = `
      :root { color-scheme: light; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; --brand:#007bff; --brand-dark:#0056b3; --ink:#172033; --muted:#667085; --surface:#fff; --line:#e7edf5; }
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body { margin: 0; background: #f5f7fa; color: var(--ink); line-height: 1.72; }
      .site-header { position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,.94); border-bottom: 1px solid var(--line); backdrop-filter: blur(12px); }
      .header-inner { width: min(920px, calc(100% - 32px)); min-height: 64px; margin: auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
      .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--brand); font-size: 1.22rem; font-weight: 800; text-decoration: none; letter-spacing: -.02em; }
      .brand img { width: 34px; height: 34px; border-radius: 9px; object-fit: contain; }
      .top-login { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 18px; border-radius: 10px; background: var(--brand); color: #fff; font-weight: 750; text-decoration: none; }
      main { width: min(920px, calc(100% - 32px)); margin: 24px auto 40px; padding: clamp(22px, 5vw, 46px); background: var(--surface); border: 1px solid var(--line); border-radius: 22px; box-shadow: 0 14px 44px rgba(26, 80, 140, .08); }
      .eyebrow { display: inline-flex; margin-bottom: 6px; padding: 6px 11px; border-radius: 999px; background: #eaf4ff; color: var(--brand-dark); font-size: .76rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      h1, h2, h3 { color: var(--ink); line-height: 1.24; letter-spacing: -.025em; }
      h1 { max-width: 720px; margin: 12px 0 16px; font-size: clamp(2rem, 7vw, 3.25rem); }
      h2 { margin-top: 0; font-size: clamp(1.38rem, 4vw, 1.8rem); }
      h3 { font-size: 1.05rem; }
      p { color: #3d485c; }
      a { color: var(--brand-dark); text-underline-offset: 3px; }
      li + li { margin-top: .55rem; }
      .cta { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; margin: .55rem 0 1.4rem; padding: 0 22px; border-radius: 12px; background: linear-gradient(135deg, #1e90ff, var(--brand)); color: #fff; font-weight: 800; text-decoration: none; box-shadow: 0 9px 20px rgba(0,123,255,.22); }
      .cta:hover, .cta:focus-visible, .top-login:hover, .top-login:focus-visible { background: var(--brand-dark); }
      .content-section { margin-top: 34px; padding-top: 30px; border-top: 1px solid var(--line); }
      .info-grid, .guide-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 18px; }
      .info-card, .guide-grid a { padding: 18px; border: 1px solid #dfeaf6; border-radius: 15px; background: #fbfdff; text-decoration: none; }
      .info-card h3 { margin: 10px 0 5px; }
      .info-card p { margin: 0; font-size: .94rem; }
      .card-icon { display: inline-flex; width: 34px; height: 34px; align-items: center; justify-content: center; border-radius: 9px; background: #eaf4ff; color: var(--brand); font-weight: 850; }
      .guide-grid { grid-template-columns: repeat(2, 1fr); }
      .guide-grid a { display: flex; flex-direction: column; transition: transform .18s ease, border-color .18s ease; }
      .guide-grid a:hover { transform: translateY(-2px); border-color: #8dc5ff; }
      .guide-grid span { color: var(--muted); font-size: .9rem; }
      .process { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0; }
      .process div { display: flex; gap: 12px; padding: 16px; border-radius: 14px; background: #f6faff; border: 1px solid #e2eefb; }
      .process b { flex: 0 0 30px; width: 30px; height: 30px; display: grid; place-items: center; border-radius: 50%; background: var(--brand); color: #fff; }
      .process span { display: flex; flex-direction: column; color: var(--muted); font-size: .88rem; line-height: 1.45; }
      .process strong { color: var(--ink); }
      .comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }
      .comparison div { padding: 18px; border-radius: 14px; background: #f6faff; border: 1px solid #e2eefb; }
      .comparison span { display: block; margin-top: 4px; color: var(--muted); }
      .check-list { padding: 0; list-style: none; }
      .check-list li { position: relative; padding-left: 30px; }
      .check-list li::before { content: "✓"; position: absolute; left: 0; top: 1px; width: 21px; height: 21px; display: grid; place-items: center; border-radius: 50%; background: #e8f6ee; color: #138a48; font-size: .76rem; font-weight: 900; }
      .notice { margin-top: 1.5rem; padding: 15px 17px; border-left: 4px solid var(--brand); border-radius: 0 12px 12px 0; background: #f0f8ff; }
      .guide-nav { margin-top: 2.25rem; padding-top: 1.25rem; border-top: 1px solid #e5e7eb; }
      .guide-nav a + a { margin-left: 12px; }
      .site-footer { padding: 0 16px 32px; color: var(--muted); text-align: center; font-size: .86rem; }
      @media (max-width: 700px) { .info-grid, .process { grid-template-columns: 1fr; } .guide-grid, .comparison { grid-template-columns: 1fr; } }
      @media (max-width: 560px) { .header-inner { width: min(100% - 24px, 920px); } main { width: min(100% - 20px, 920px); margin: 10px auto 26px; padding: 22px 18px; border-radius: 16px; } .guide-nav { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; } .guide-nav a + a { margin-left: 0; } }
`;

const guideNavigation = `
      <nav class="guide-nav" aria-label="ShowPay guide navigation">
        <a href="/showpay-guide.html">All ShowPay guides</a>
        <a href="/about-showpay.html">About ShowPay</a>
        <a href="/showpay-support.html">Support</a>
        <a href="/">Login</a>
      </nav>`;

for (const page of pages) {
  const canonical = `${domain}${page.route ?? `/${page.filename}`}`;
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${page.title}</title>
    <meta name="description" content="${page.description}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${canonical}" />
    <link rel="icon" type="image/png" href="/showpay-logo.png" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="ShowPay" />
    <meta property="og:title" content="${page.title}" />
    <meta property="og:description" content="${page.description}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${socialImage}" />
    <meta property="og:image:alt" content="ShowPay logo" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${page.title}" />
    <meta name="twitter:description" content="${page.description}" />
    <meta name="twitter:image" content="${socialImage}" />
    <script type="application/ld+json">${JSON.stringify(page.schema)}</script>
    <style>${styles}</style>
  </head>
  <body>
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="/" aria-label="ShowPay home"><img src="/showpay-logo.png" width="34" height="34" alt="" /><span>ShowPay</span></a>
        <a class="top-login" href="/">Login</a>
      </div>
    </header>
    <main>
      <span class="eyebrow">ShowPay Help Center</span>
${page.body.trim()}
      <a class="cta" href="/">ShowPay Login</a>
${extendedContent[page.filename] ?? ''}
${guideNavigation}
    </main>
    <footer class="site-footer">ShowPay public help guides · Always verify the current information inside your account.</footer>
  </body>
</html>
`;

  writeIfChanged(path.join(publicDir, page.filename), html);
}

const robots = `User-agent: *
Disallow: /admin
Disallow: /admin-app/
Allow: /

Sitemap: ${domain}/sitemap.xml
`;

writeIfChanged(path.join(publicDir, 'robots.txt'), robots);
require('./generate-sitemap.cjs');

console.log('SEO pages, robots.txt and sitemap.xml generated successfully.');
