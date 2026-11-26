'use strict';
// Traductions de l'interface. Les textes sont insérés via textContent / placeholder / title (jamais en HTML).

const I18N = {
  en: {
    noDevice: 'Device not detected', connected: 'DisplayPad connected',
    profile: 'Profile', profileName: 'Profile name', newProfile: 'New profile', duplicate: 'Duplicate', delProfile: 'Delete profile',
    import: 'Import', export: 'Export',
    page: 'Page', pageName: 'Page name', newPage: 'New page', addPage: '+ Page', delPage: 'Delete page',
    globalImg: 'Global image (624×208)', pickGlobal: 'Choose global.jpg…', remove: 'Remove', openDir: '📁 Images folder',
    hint: 'If the device stays "not detected", close Mountain Base Camp (it locks the device) and reconnect the DisplayPad.',
    padHelp: 'Click a key to configure it. Physical keys light up here when you press them.',
    autostart: 'Start with Windows', startHidden: 'Start minimized to the notification area',
    key: 'Key', image: 'Image', globalNote: 'This page uses the global image: the key shows its matching part.',
    drop: 'Drop an image here', dropSub: 'Resized to 104×104 and saved under the key number',
    pickFile: 'Choose a file…', clearImg: 'Remove image', background: 'Background',
    text: 'Text', labelPh: 'Displayed text (otherwise: action text)', textColor: 'Text color',
    action: 'Action', actNone: 'None', actShortcut: 'Keyboard shortcut', actLaunch: 'Launch a program', actUrl: 'Open a web link',
    actPage: 'Go to a page', actProfile: 'Switch profile',
    shortcutPh: 'Click here then type the shortcut', mediaPh: 'Or a media key…',
    shortcutNote: 'The shortcut is sent to the active window (Windows only).',
    launchPh: 'C:\\Path\\program.exe', browse: 'Browse…', argsPh: 'Arguments (optional)', urlPh: 'https://example.com',
    urlWarn: 'Only http:// and https:// links are accepted.', test: 'Test action', resetKey: 'Reset key',
    link: 'Link', badImage: 'Unreadable or unsupported image.', badFile: 'Invalid file.',
    confirmDelProfile: 'Delete profile "{0}"?', confirmImport: 'Importing replaces all your current profiles. Continue?',
    confirmDelPage: 'Delete page "{0}" and its images?', copy: ' (copy)',
    k: { shift: 'Shift', esc: 'Esc', enter: 'Enter', space: 'Space', delete: 'Del', printscreen: 'PrtSc', playpause: 'Play/Pause', nexttrack: 'Next track', prevtrack: 'Prev. track', stopmedia: 'Stop', mute: 'Mute' },
  },
  fr: {
    noDevice: 'Appareil non détecté', connected: 'DisplayPad connecté',
    profile: 'Profil', profileName: 'Nom du profil', newProfile: 'Nouveau profil', duplicate: 'Dupliquer', delProfile: 'Supprimer le profil',
    import: 'Importer', export: 'Exporter',
    page: 'Page', pageName: 'Nom de la page', newPage: 'Nouvelle page', addPage: '+ Page', delPage: 'Supprimer la page',
    globalImg: 'Image globale (624×208)', pickGlobal: 'Choisir global.jpg…', remove: 'Retirer', openDir: '📁 Dossier des images',
    hint: "Si l'appareil reste « non détecté », fermez Mountain Base Camp (il utilise l'appareil en exclusivité) puis rebranchez le DisplayPad.",
    padHelp: "Cliquez sur une touche pour la configurer. Les touches physiques s'illuminent ici quand vous appuyez dessus.",
    autostart: 'Lancer avec Windows', startHidden: 'Démarrer réduit dans la zone de notification',
    key: 'Touche', image: 'Image', globalNote: "Cette page utilise l'image globale : la touche en affiche la portion correspondante.",
    drop: 'Glissez une image ici', dropSub: 'Redimensionnée en 104×104 et enregistrée sous le numéro de la touche',
    pickFile: 'Choisir un fichier…', clearImg: "Retirer l'image", background: 'Fond',
    text: 'Texte', labelPh: "Texte affiché (sinon : texte de l'action)", textColor: 'Couleur du texte',
    action: 'Action', actNone: 'Aucune', actShortcut: 'Raccourci clavier', actLaunch: 'Lancer un programme', actUrl: 'Ouvrir un lien web',
    actPage: 'Aller à une page', actProfile: 'Changer de profil',
    shortcutPh: 'Cliquez ici puis tapez le raccourci', mediaPh: 'Ou une touche multimédia…',
    shortcutNote: 'Le raccourci est envoyé à la fenêtre active (Windows uniquement).',
    launchPh: 'C:\\Chemin\\programme.exe', browse: 'Parcourir…', argsPh: 'Arguments (facultatif)', urlPh: 'https://exemple.com',
    urlWarn: 'Seuls les liens http:// et https:// sont acceptés.', test: "Tester l'action", resetKey: 'Réinitialiser la touche',
    link: 'Lien', badImage: 'Image illisible ou non prise en charge.', badFile: 'Fichier invalide.',
    confirmDelProfile: 'Supprimer le profil « {0} » ?', confirmImport: 'Importer remplace tous vos profils actuels. Continuer ?',
    confirmDelPage: 'Supprimer la page « {0} » et ses images ?', copy: ' (copie)',
    k: { shift: 'Maj', esc: 'Échap', enter: 'Entrée', space: 'Espace', delete: 'Suppr', printscreen: 'Impr. écran', playpause: 'Lecture/Pause', nexttrack: 'Piste suivante', prevtrack: 'Piste préc.', stopmedia: 'Stop', mute: 'Muet' },
  },
  es: {
    noDevice: 'Dispositivo no detectado', connected: 'DisplayPad conectado',
    profile: 'Perfil', profileName: 'Nombre del perfil', newProfile: 'Nuevo perfil', duplicate: 'Duplicar', delProfile: 'Eliminar perfil',
    import: 'Importar', export: 'Exportar',
    page: 'Página', pageName: 'Nombre de la página', newPage: 'Nueva página', addPage: '+ Página', delPage: 'Eliminar página',
    globalImg: 'Imagen global (624×208)', pickGlobal: 'Elegir global.jpg…', remove: 'Quitar', openDir: '📁 Carpeta de imágenes',
    hint: 'Si el dispositivo sigue «no detectado», cierra Mountain Base Camp (bloquea el dispositivo) y vuelve a conectar el DisplayPad.',
    padHelp: 'Haz clic en una tecla para configurarla. Las teclas físicas se iluminan aquí al pulsarlas.',
    autostart: 'Iniciar con Windows', startHidden: 'Iniciar minimizado en el área de notificación',
    key: 'Tecla', image: 'Imagen', globalNote: 'Esta página usa la imagen global: la tecla muestra la parte correspondiente.',
    drop: 'Arrastra una imagen aquí', dropSub: 'Redimensionada a 104×104 y guardada con el número de la tecla',
    pickFile: 'Elegir un archivo…', clearImg: 'Quitar imagen', background: 'Fondo',
    text: 'Texto', labelPh: 'Texto mostrado (si no: texto de la acción)', textColor: 'Color del texto',
    action: 'Acción', actNone: 'Ninguna', actShortcut: 'Atajo de teclado', actLaunch: 'Abrir un programa', actUrl: 'Abrir un enlace web',
    actPage: 'Ir a una página', actProfile: 'Cambiar de perfil',
    shortcutPh: 'Haz clic aquí y escribe el atajo', mediaPh: 'O una tecla multimedia…',
    shortcutNote: 'El atajo se envía a la ventana activa (solo Windows).',
    launchPh: 'C:\\Ruta\\programa.exe', browse: 'Examinar…', argsPh: 'Argumentos (opcional)', urlPh: 'https://ejemplo.com',
    urlWarn: 'Solo se aceptan enlaces http:// y https://.', test: 'Probar acción', resetKey: 'Restablecer tecla',
    link: 'Enlace', badImage: 'Imagen ilegible o no compatible.', badFile: 'Archivo no válido.',
    confirmDelProfile: '¿Eliminar el perfil «{0}»?', confirmImport: 'Importar reemplaza todos tus perfiles actuales. ¿Continuar?',
    confirmDelPage: '¿Eliminar la página «{0}» y sus imágenes?', copy: ' (copia)',
    k: { shift: 'Mayús', esc: 'Esc', enter: 'Intro', space: 'Espacio', delete: 'Supr', printscreen: 'Impr. pant.', playpause: 'Reproducir/Pausa', nexttrack: 'Pista sig.', prevtrack: 'Pista ant.', stopmedia: 'Detener', mute: 'Silencio' },
  },
};

let LANG = 'en';
function t(key, ...args) {
  const s = (I18N[LANG] && I18N[LANG][key]) || I18N.en[key] || key;
  return typeof s === 'string' ? s.replace(/\{(\d)\}/g, (_, n) => String(args[n] ?? '')) : s;
}
function applyI18n(lang) {
  LANG = I18N[lang] ? lang : 'en';
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); });
  document.querySelectorAll('.flag').forEach((b) => b.classList.toggle('on', b.dataset.lang === LANG));
}
