"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import { LogIn, XCircle, UserPlus } from 'lucide-react';
import { loginUser, registerUser, getUserFromToken } from '../../api/authHandler';

interface AdminLoginEmbeddedProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  company: string;
  email: string;
  password: string;
  language: string;
  currency: string;
  subscriptionPlan: string;
}

export function AdminLoginEmbedded({ onLoginSuccess, onCancel }: AdminLoginEmbeddedProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch, getValues } = useForm<FormData>({
    defaultValues: {
      name: '',
      company: '',
      email: '',
      password: '',
      language: 'en',
      currency: 'USD',
      subscriptionPlan: 'admin',
    },
  });

  const subscriptionPlan = watch('subscriptionPlan');
  const language = watch('language');
  const currency = watch('currency');

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      const token = localStorage.getItem('adminToken');
      if (token) {
        getUserFromToken(token).then((response: any) => {
          if (response.success ) {
            localStorage.setItem('isAdminLoggedIn', 'true');
            router.replace('/admin');
            onLoginSuccess();
          }
        });
      }
    }
  }, [router, hasMounted, onLoginSuccess]);

  const handleLogin = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await loginUser(data.email, data.password);
    
      if (
        response?.success &&
        response?.data?.token &&
        response?.data?.user?.role === 'admin'
      ) {
        console.log('Role:', response.data.user.role); // <- safe now
        console.log('Token is', response.data.token);
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('isAdminLoggedIn', 'true');
        router.replace('/admin');
        onLoginSuccess();
      } else {
        setError('Invalid credentials or insufficient permissions');
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Create an account before logging in.'
      );
    } finally {
      setIsSubmitting(false);
    }
    
  };

  const handleContinue = async (data: FormData) => {
    if (!hasMounted) return;

    setIsSubmitting(true);
    setError(null);

    if (!data.name || !data.company || !data.email || !data.password || !data.language || !data.currency) {
      setError('All fields are required');
      setIsSubmitting(false);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setError('Invalid email format');
      setIsSubmitting(false);
      return;
    }
    if (data.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsSubmitting(false);
      return;
    }

    // Persist form data and move to subscription selection
    setShowSubscription(true);
    setIsSubmitting(false);
  };

  const handleSignup = async () => {
    if (!hasMounted) return;

    setIsSubmitting(true);
    setError(null);

    const data = getValues(); // Retrieve persisted form data
    try {
      if (!data.subscriptionPlan) {
        setError('Please select a subscription plan');
        setIsSubmitting(false);
        return;
      }
      if (!data.name || !data.company || !data.email || !data.password || !data.language || !data.currency) {
        setError('All required fields must be filled in the previous step');
        setIsSubmitting(false);
        return;
      }

      const response = await registerUser(
        data.id,
        data.name,
        data.email,
        data.password,
        data.language,
        data.currency,
        data.company,
        data.subscriptionPlan,
        'admin'
      );

      console.log(response)
      if (response.success) {
        router.replace('/admin');
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('isAdminLoggedIn', 'true');
        onLoginSuccess();
      } else {
        setError(response.message || 'Failed to create admin account');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError(null);
    setShowSubscription(false);
    // Do not reset form to preserve data
    setValue('email', '');
    setValue('password', '');
  };

  const goBack = () => {
    setShowSubscription(false);
    setError(null);
  };

  if (!hasMounted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
        <Image
          src="https://placehold.co/128x128.png"
          alt={`${APP_NAME} Logo`}
          width={64}
          height={64}
          className="mb-3 rounded-lg shadow-md animate-pulse"
          data-ai-hint="logo company"
        />
        <p className="text-muted-foreground">Loading {isLoginMode ? 'Admin Login' : 'Admin Signup'}...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-background/90 backdrop-blur-sm">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Close">
          <XCircle className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors" />
        </Button>
      </div>
      <div className="flex flex-col items-center mb-8">
        <Image
          src="https://placehold.co/128x128.png"
          alt={`${APP_NAME} Logo`}
          width={64}
          height={64}
          className="mb-3 rounded-lg shadow-md"
          data-ai-hint="logo company"
        />
        <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
        <p className="text-muted-foreground">Admin Portal</p>
      </div>
      <Card className="w-full max-w-sm shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isLoginMode ? 'Admin Login' : showSubscription ? 'Select Subscription Plan' : 'Create Admin Account'}
          </CardTitle>
          <CardDescription>
            {isLoginMode
              ? 'Access the administration panel.'
              : showSubscription
              ? 'Choose a subscription plan for your account.'
              : 'Create a new admin account.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <form onSubmit={handleSubmit(isLoginMode ? handleLogin : showSubscription ? handleSignup : handleContinue)} className="space-y-4">
            {(!isLoginMode && !showSubscription) && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    {...register('name', {
                      required: 'Name is required',
                      minLength: { value: 2, message: 'Name must be at least 2 characters' },
                    })}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Acme Corp"
                    {...register('company', {
                      required: 'Company is required',
                      minLength: { value: 2, message: 'Company name must be at least 2 characters' },
                    })}
                    className={errors.company ? 'border-destructive' : ''}
                  />
                  {errors.company && <p className="text-sm text-destructive">{errors.company.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Invalid email address',
                      },
                    })}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' },
                    })}
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    onValueChange={(value) => setValue('language', value, { shouldValidate: true })}
                    defaultValue={language}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.language && <p className="text-sm text-destructive">{errors.language.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    onValueChange={(value) => setValue('currency', value, { shouldValidate: true })}
                    defaultValue={currency}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">Indian Rupee (INR)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                      <SelectItem value="JPY">Japanese Yen (JPY)</SelectItem>
                      <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
                      <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.currency && <p className="text-sm text-destructive">{errors.currency.message}</p>}
                </div>
              </>
            )}
            {isLoginMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Invalid email address',
                      },
                    })}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' },
                    })}
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>
              </>
            )}
            {!isLoginMode && showSubscription && (
              <div className="space-y-2">
                <Label htmlFor="subscriptionPlan">Subscription Plan</Label>
                <Select
                  onValueChange={(value) => setValue('subscriptionPlan', value, { shouldValidate: true })}
                  defaultValue={subscriptionPlan}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin Only - $199</SelectItem>
                    <SelectItem value="basic">1 Store, 5 Employees - $399</SelectItem>
                    <SelectItem value="pro">3 Stores, 20 Employees - $999</SelectItem>
                    <SelectItem value="unlimited">Unlimited - $9999</SelectItem>
                  </SelectContent>
                </Select>
                {errors.subscriptionPlan && <p className="text-sm text-destructive">{errors.subscriptionPlan.message}</p>}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isLoginMode ? (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  {isSubmitting ? 'Logging In...' : 'Login as Admin'}
                </>
              ) : showSubscription ? (
                <>
                  <UserPlus className="mr-2 h-5 w-5" />
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-5 w-5" />
                  {isSubmitting ? 'Processing...' : 'Continue'}
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          {!isLoginMode && showSubscription ? (
            <Button variant="link" onClick={goBack} className="text-sm text-primary">
              Go Back
            </Button>
          ) : (
            <Button variant="link" onClick={toggleMode} className="text-sm text-primary">
              {isLoginMode ? 'Need an account? Create one' : 'Already have an account? Log in'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}