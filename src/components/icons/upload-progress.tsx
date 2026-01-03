import { Loader2 } from 'lucide-react';
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

const UploadProgress = ({
  isUploading,
  progress,
  status,
}: {
  isUploading: boolean;
  progress: number;
  status: string;
}) => {
  if (!isUploading) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg border bg-background p-8 shadow-lg sm:rounded-lg">
        <div className="flex flex-col items-center space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <Alert className="w-full">
              <AlertDescription className="text-center font-medium">
                {status}
              </AlertDescription>
            </Alert>
          </div>
          <div className="w-full space-y-2">
            <Progress value={progress} className="h-2 w-full" />
            <p className="text-center text-sm text-muted-foreground">
              {progress}% 완료
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default UploadProgress;
