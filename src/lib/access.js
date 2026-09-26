// Who gets which page.
//
// The SOP is the Product Operations Manager's routine, tied to the one mailbox the hub
// reads. Another account opening it would see a checklist counting somebody else's
// inbox, which is worse than not having the page at all.
//
// ponytail: a list in the source, because there is one person on it. When a second role
// needs its own SOP this becomes a column on a profiles table, not a longer array.
export const SOP_USERS = ['production@siinge.studio']

export const canSeeSop = email => SOP_USERS.includes(String(email || '').trim().toLowerCase())
