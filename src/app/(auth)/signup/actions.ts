'use server';

import { signUpFormSchema } from '@/app/(auth)/signup/validation';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/db/prisma';
import makeLogin from '@/lib/make-login';
import { redirect } from 'next/navigation';

type FormState = {
  fieldErrors?: {
    username?: string[];
    email?: string[];
    password?: string[];
    confirm_password?: string[];
  };
  formErrors?: string[];
};

export async function signUp(prevState: FormState | null, formData: FormData) {
  const data = {
    username: formData.get('username') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirm_password: formData.get('confirm_password') as string,
  };

  const result = await signUpFormSchema.safeParseAsync(data);

  if (!result.success) {
    console.log(result.error);
    return result.error.flatten();
  } else {
    const hashedPassword = await bcrypt.hash(result.data.password, 12);

    const user = await prisma.user.create({
      data: {
        username: result.data.username,
        email: result.data.email,
        password: hashedPassword,
      },
      select: {
        id: true,
      },
    });

    await makeLogin(user.id);
    return redirect('/admin');
  }
}
