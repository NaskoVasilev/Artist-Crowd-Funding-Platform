import UsersController from '../controllers/users-controller'
import { addValidation } from '../middleware/add-validate-middleware'
import { RegisterValidators } from '../validators/register-validators'
import { addAuth } from '../middleware/add-authorization'

export const usersRoutes = (expressApp: any) => {
    const router = expressApp.Router()

    router.post('/register', UsersController.register)
    router.post('/login', UsersController.login)

    router.get('/profile', addAuth, UsersController.profile)
    router.put('/profile', addValidation(RegisterValidators), UsersController.updateProfile)

    return router
}
