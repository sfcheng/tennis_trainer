# Court Notes · Tennis Trainer

A responsive tennis notebook built with Vite, plain JavaScript, and a PHP JSON API. Includes all 13 skills from `spec.txt`, alphabetically sorted skills, skill/tip creation, editing and deletion, and repeat thumbs-up votes. Tips appear in descending confirmation count. New notebooks start with empty tips.

Tips have a short title and an optional detailed description. Tap a title to expand its description and editing controls. Helpful buttons remain visible when tips are collapsed. Existing title-only tips work without migration; descriptions can be added with Edit.

## Local development

Requires Node.js 20.19+ or 22.12+, and PHP 7.4+ with write access to the API folder.

```powershell
npm install
php -S 127.0.0.1:8081 -t public
```

In a second terminal:

```powershell
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies API requests to PHP on port 8081. On this machine PHP is available at `C:/wamp64/bin/php/php8.3.6/php.exe` if it is not on PATH.

To use http://tennis_trainer with Apache/Wamp, build and point the `tennis_trainer` virtual host's document root at this project's `dist` folder. Add `127.0.0.1 tennis_trainer` to the Windows hosts file if it is not already configured. Enable PHP and allow `.htaccess` overrides.

## Build and deployment

```powershell
npm run build
```

Upload the **contents** of `dist/` to the server's `/tennis_trainer/` folder for http://edu.flashpeak.com/tennis_trainer/. Relative asset and API URLs support both this subfolder and a root virtual host.

The API creates `training.json` and `training.lock` beside `api.php`. The PHP process needs write permission on that folder. Writes use an exclusive lock and temporary file replacement. Runtime notebook data is ignored by Git and excluded from the build. Keep the production `training.json` when uploading updates; back it up regularly. Builds preserve existing files in `dist` so local Apache notebook data survives a rebuild. Do not upload local `training.json` or `training.lock` files when deploying updates.

Apache's included `.htaccess` blocks direct access to notebook JSON and lock files. On other servers, configure the equivalent denial and disable directory listings. This is a shared family notebook without accounts: anyone with access to the app can edit it. Restrict access at the web server if needed.

## Verification

With both development servers running:

```powershell
node scripts/api-smoke.mjs
```

The smoke test adds its own temporary skill, verifies skill/tip CRUD, repeated votes, persistence, and validation, then removes the temporary skill. To test another server, set `API_URL` to its full `api.php` URL.

`npm run build` verifies the production frontend build. `php -l public/api.php` checks backend syntax.
