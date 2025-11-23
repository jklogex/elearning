# Quick Guide: Grant Admin to jkenyone@gmail.com

## ✅ Easiest Method: Firebase Console (2 minutes)

1. **Open Firebase Console**: https://console.firebase.google.com/
2. **Select your project**
3. **Click "Firestore Database"** in the left menu
4. **Click on the `users` collection**
5. **Find the user** with email `jkenyone@gmail.com`
   - If you don't see the user, they need to **sign up first** through the app
6. **Click on the user document** to open it
7. **Click the "Edit" button** (pencil icon)
8. **Change the `role` field** from `employee` to `admin`
9. **Click "Update"**

**Done!** The user will have admin access the next time they log in.

---

## 🔄 If User Doesn't Exist Yet

The user `jkenyone@gmail.com` needs to:
1. Go to your app
2. Click "Registrarse" (Sign Up)
3. Create an account with that email
4. Then follow the steps above to grant admin

---

## ✅ Verify It Worked

After granting admin:
1. User should **log out and log back in**
2. They should see these admin menu items:
   - ✅ "Equipo" (Team Management)
   - ✅ "Asignaciones" (Assignments)
   - ✅ "Reportes" (Reports)
   - ✅ "Creador de Cursos" (Course Creator)

---

## 📝 Alternative: Update Firestore Rules First

I've already updated your `firestore.rules` file to allow admins to update user roles. 

**To deploy the updated rules:**
```bash
npx firebase deploy --only firestore:rules
```

After deploying, any existing admin can update user roles through the app (if that feature is added to the UI).

---

## 🚨 Troubleshooting

**User not found?**
- They must sign up first through the app
- Check the email spelling: `jkenyone@gmail.com`

**Changes not showing?**
- User must log out and log back in
- Clear browser cache
- Verify `role` field is exactly `"admin"` (lowercase, with quotes)

**Permission denied?**
- Use Firebase Console method (it always works)
- Or deploy the updated Firestore rules first

---

## 📚 More Details

See `GRANT_ADMIN_INSTRUCTIONS.md` for:
- Script-based methods
- Programmatic approaches
- Security best practices

