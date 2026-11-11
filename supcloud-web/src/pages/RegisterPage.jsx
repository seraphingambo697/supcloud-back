import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Cloud, User, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../api/client'
import { Spinner } from '../components/ui'
import toast from 'react-hot-toast'

function Field({
  fieldKey,
  label,
  IconComponent,
  type,
  placeholder,
  value,
  error,
  show,
  setShow,
  onChange,
}) {
  return (
    <div>
      <label className="text-sm text-dark-muted mb-1.5 block">
        {label}
      </label>

      <div className="relative">
        <IconComponent
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted"
        />

        <input
          type={type === 'password' ? (show ? 'text' : 'password') : type}
          placeholder={placeholder}
          className={`input pl-9 ${error ? 'border-danger' : ''}`}
          value={value}
          onChange={onChange}
          autoComplete={
            fieldKey === 'email'
              ? 'email'
              : fieldKey === 'name'
                ? 'name'
                : 'new-password'
          }
        />

        {type === 'password' && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text"
            onClick={() => setShow(s => !s)}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {error && (
        <p className="text-danger text-xs mt-1">
          {error}
        </p>
      )}
    </div>
  )
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
  })

  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}

    if (!form.name.trim()) {
      e.name = 'Nom requis'
    }

    if (!form.email.includes('@')) {
      e.email = 'Email invalide'
    }

    if (form.password.length < 8) {
      e.password = 'Minimum 8 caractères'
    }

    if (form.password !== form.confirm) {
      e.confirm = 'Les mots de passe ne correspondent pas'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)

    try {
      await register(
        form.name.trim(),
        form.email.trim(),
        form.password
      )

      toast.success('Compte créé avec succès !')
      navigate('/')
    } catch (err) {
      setErrors({
        global: getErrorMessage(err),
      })
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }))

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }))
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-3xl bg-primary flex items-center justify-center mb-3 shadow-lg shadow-primary/30">
            <Cloud size={28} className="text-white" />
          </div>

          <h1 className="font-display font-bold text-2xl">
            Créer un compte
          </h1>

          <p className="text-dark-muted text-sm mt-1">
            30 Go gratuits — aucun moyen de paiement
          </p>
        </div>

        <div className="card p-8">
          {errors.global && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 mb-4 text-danger text-sm">
              {errors.global}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              fieldKey="name"
              label="Nom complet"
              IconComponent={User}
              type="text"
              placeholder="Jean Dupont"
              value={form.name}
              error={errors.name}
              onChange={e => updateField('name', e.target.value)}
            />

            <Field
              fieldKey="email"
              label="Email"
              IconComponent={Mail}
              type="email"
              placeholder="jean@exemple.com"
              value={form.email}
              error={errors.email}
              onChange={e => updateField('email', e.target.value)}
            />

            <Field
              fieldKey="password"
              label="Mot de passe"
              IconComponent={Lock}
              type="password"
              placeholder="••••••••"
              value={form.password}
              error={errors.password}
              show={show}
              setShow={setShow}
              onChange={e => updateField('password', e.target.value)}
            />

            <Field
              fieldKey="confirm"
              label="Confirmer le mot de passe"
              IconComponent={Lock}
              type="password"
              placeholder="••••••••"
              value={form.confirm}
              error={errors.confirm}
              show={show}
              setShow={setShow}
              onChange={e => updateField('confirm', e.target.value)}
            />

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 mt-2"
            >
              {loading ? (
                <Spinner size="sm" />
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-dark-muted mt-6">
            Déjà un compte ?{' '}
            <Link
              to="/login"
              className="text-primary hover:underline font-medium"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}