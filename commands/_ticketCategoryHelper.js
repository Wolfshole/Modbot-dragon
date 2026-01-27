// Zusatz für ticketPanel.js - am Ende vor module.exports einfügen

/**
 * Gibt Informationen zur Ticket-Kategorie zurück
 */
function getCategoryInfo(category) {
  const categories = {
    'support': {
      label: 'Support',
      emoji: '🆘',
      color: '#0099ff',
      description: '**Du hast ein Problem oder brauchst Hilfe?**\nUnser Support-Team ist für dich da!'
    },
    'bug': {
      label: 'Bug Report',
      emoji: '🐛',
      color: '#ff0000',
      description: '**Danke für deinen Bug Report!**\nBitte beschreibe das Problem so detailliert wie möglich.'
    },
    'frage': {
      label: 'Frage',
      emoji: '❓',
      color: '#ffff00',
      description: '**Du hast eine Frage?**\nWir helfen dir gerne weiter!'
    },
    'bewerbung': {
      label: 'Bewerbung',
      emoji: '📝',
      color: '#00ff00',
      description: '**Vielen Dank für deine Bewerbung!**\nBitte beantworte alle Fragen ehrlich und ausführlich.'
    },
    'report': {
      label: 'Report',
      emoji: '⚠️',
      color: '#ff6600',
      description: '**Danke für deinen Report!**\nBitte beschreibe den Vorfall mit allen relevanten Details und Beweisen.'
    },
    'sonstiges': {
      label: 'Sonstiges',
      emoji: '📌',
      color: '#888888',
      description: '**Du hast ein anderes Anliegen?**\nKein Problem, beschreibe uns dein Anliegen!'
    }
  };
  
  return categories[category] || categories['sonstiges'];
}
