import fs from 'fs';
import path from 'path';

const structure = {
  'public': ['favicon.ico', 'manifest.json', 'robots.txt', 'offline.html'],
  'assets/logo': ['showpay-logo.png', 'admin-logo.png', 'favicon.png'],
  'assets/icons': ['home.svg', 'deposit.svg', 'upi.svg', 'team.svg', 'profile.svg', 'logout.svg', 'search.svg', 'delete.svg', 'restore.svg', 'upload.svg', 'telegram.svg', 'play.svg', 'pdf.svg', 'gmail.svg'],
  'assets/images': ['login-bg.png', 'empty.png', 'banner-placeholder.png', 'slider-placeholder.png', 'telegram-popup.png'],
  'assets/fonts': [],
  'assets/videos': [],
  'supabase': ['supabase.js', 'auth.js', 'realtime.js', 'storage.js', 'database.js', 'helpers.js'],
  'shared/css': ['variables.css', 'reset.css', 'common.css', 'button.css', 'form.css', 'popup.css', 'slider.css', 'footer.css', 'table.css', 'animation.css', 'responsive.css'],
  'shared/js': ['constants.js', 'config.js', 'utils.js', 'validation.js', 'storage.js', 'auth-guard.js', 'popup.js', 'slider.js', 'toast.js', 'pdf.js', 'gmail.js', 'logout.js', 'realtime.js'],
  'shared/components': ['header.html', 'footer.html', 'mpin-popup.html', 'success-popup.html', 'video-popup.html', 'telegram-popup.html', 'loading.html', 'notification.html'],
  'database': ['schema.sql', 'policies.sql', 'buckets.sql', 'triggers.sql', 'seed.sql'],
  'user-app/pages': ['login.html', 'home.html', '404.html'],
  'user-app/css': ['login.css', 'home.css', 'popup.css', 'responsive.css'],
  'user-app/js': ['login.js', 'home.js', 'session.js', 'mpin.js', 'slider.js', 'video.js', 'telegram.js', 'logout.js', 'workflow.js', 'auth.js'],
  'user-app/components': ['footer.html', 'slider.html', 'mpin-popup.html', 'success-popup.html', 'video-popup.html', 'telegram-popup.html'],
  'admin-app/pages': ['login.html', 'dashboard.html', 'users.html', 'user-details.html', 'reports.html', 'slider.html', 'banner.html', 'video-popup.html', 'telegram.html', 'settings.html', 'trash.html', 'notifications.html', 'activity.html', 'profile.html', '404.html'],
  'admin-app/css': ['login.css', 'dashboard.css', 'users.css', 'reports.css', 'slider.css', 'banner.css', 'video.css', 'telegram.css', 'settings.css', 'trash.css', 'activity.css', 'profile.css', 'responsive.css'],
  'admin-app/js': ['login.js', 'dashboard.js', 'users.js', 'user-details.js', 'reports.js', 'slider.js', 'banner.js', 'video.js', 'telegram.js', 'settings.js', 'trash.js', 'notifications.js', 'activity.js', 'profile.js', 'pdf.js', 'gmail.js', 'upload.js', 'realtime.js', 'auth.js'],
  'admin-app/components': ['sidebar.html', 'header.html', 'stats-card.html', 'table.html', 'upload-modal.html', 'delete-modal.html', 'restore-modal.html', 'loading.html'],
  'docs': ['PROJECT.md', 'WORKFLOW.md', 'DATABASE.md', 'API.md', 'DEPLOYMENT.md', 'SUPABASE.md', 'STORAGE.md', 'CHANGELOG.md'],
  'tests': ['login-test.md', 'workflow-test.md', 'admin-test.md', 'storage-test.md', 'realtime-test.md', 'final-checklist.md']
};

for (const [dir, files] of Object.entries(structure)) {
  fs.mkdirSync(dir, { recursive: true });
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '');
    }
  }
}

// Create root files if not exist
['README.md', '.gitignore', 'user-app/index.html', 'admin-app/index.html'].forEach(file => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '');
  }
});

console.log('Folder structure created successfully.');
