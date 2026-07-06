import bcrypt from 'bcryptjs';

process.env['MONGODB_URI']           = 'mongodb://localhost/test-casa-caldereta';
process.env['JWT_SECRET']            = 'test-jwt-secret-for-testing-only-32chars';
process.env['JWT_REFRESH_SECRET']    = 'test-refresh-secret-for-testing-32chars';
process.env['ADMIN_EMAIL']           = 'admin@test.com';
process.env['ADMIN_PASSWORD_HASH']   = bcrypt.hashSync('test-admin-password', 4);
process.env['CLOUDINARY_CLOUD_NAME'] = 'test-cloud';
process.env['CLOUDINARY_API_KEY']    = '123456789012345';
process.env['CLOUDINARY_API_SECRET'] = 'test-cloudinary-api-secret-value';
process.env['STRIPE_SECRET_KEY']     = 'sk_test_mock_key_for_testing_purposes';
process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_test_mock_webhook_secret_value';
process.env['FRONTEND_URL']          = 'http://localhost:4200';
process.env['ICAL_EXPORT_TOKEN']     = 'test-ical-export-token-for-testing-only';
process.env['NODE_ENV']              = 'test';
