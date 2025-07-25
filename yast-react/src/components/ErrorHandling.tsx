import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  AlertTitle,
  Button,
  CircularProgress,
  LinearProgress,
  Skeleton,
  Grid,
  Chip,
  IconButton,
  Collapse,
  Divider
} from '@mui/material';
import {
  Error,
  Warning,
  Info,
  Refresh,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  WifiOff,
  CloudOff,
  ErrorOutline,
  HourglassEmpty
} from '@mui/icons-material';

// Error types and interfaces
export interface AppError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source?: 'api' | 'calculation' | 'validation' | 'network' | 'unknown';
}

export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  stage?: string;
  totalStages?: number;
  currentStage?: number;
  message?: string;
}

// Error boundary component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error!}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
interface DefaultErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({ error, resetError }) => {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <Card sx={{ m: 2, borderColor: 'error.main' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ErrorOutline color="error" sx={{ mr: 1 }} />
          <Typography variant="h6" color="error">
            Something went wrong
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          An unexpected error occurred while loading the dashboard. This might be due to a data processing issue or network problem.
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Refresh />}
            onClick={resetError}
          >
            Try Again
          </Button>
          
          <Button
            variant="outlined"
            startIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </Box>
        
        <Collapse in={showDetails}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" color="error" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {error.message}
          </Typography>
          {error.stack && (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', mt: 1, display: 'block' }}>
              {error.stack}
            </Typography>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};

// Loading states components
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  centered?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  message,
  centered = true 
}) => {
  const getSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'large': return 60;
      default: return 40;
    }
  };

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <CircularProgress size={getSize()} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );

  if (centered) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '200px',
        width: '100%'
      }}>
        {content}
      </Box>
    );
  }

  return content;
};

// Progress loading component
interface ProgressLoadingProps {
  progress: number;
  total?: number;
  current?: number;
  stage?: string;
  message?: string;
}

export const ProgressLoading: React.FC<ProgressLoadingProps> = ({
  progress,
  total,
  current,
  stage,
  message
}) => {
  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Loading Dashboard Data
          </Typography>
          
          {stage && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {stage}
            </Typography>
          )}
          
          {total && current && (
            <Typography variant="caption" color="text.secondary">
              Step {current} of {total}
            </Typography>
          )}
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ mb: 2, height: 8, borderRadius: 4 }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {message || 'Processing...'}
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {Math.round(progress)}%
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

// Skeleton loading components
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 6 
}) => {
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={`header-${index}`}
            variant="rectangular"
            width="100%"
            height={40}
            sx={{ flex: 1 }}
          />
        ))}
      </Box>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Box key={`row-${rowIndex}`} sx={{ display: 'flex', gap: 1, mb: 1 }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              variant="rectangular"
              width="100%"
              height={32}
              sx={{ flex: 1 }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
};

export const CardSkeleton: React.FC<{ height?: number }> = ({ height = 200 }) => {
  return (
    <Card>
      <CardContent>
        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={height - 80} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="rectangular" width={80} height={24} />
          <Skeleton variant="rectangular" width={100} height={24} />
          <Skeleton variant="rectangular" width={90} height={24} />
        </Box>
      </CardContent>
    </Card>
  );
};

export const MetricsSkeleton: React.FC = () => {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Grid item xs={12} md={3} key={index}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Skeleton variant="circular" width={40} height={40} sx={{ mx: 'auto', mb: 1 }} />
              <Skeleton variant="text" width="80%" height={24} sx={{ mx: 'auto', mb: 1 }} />
              <Skeleton variant="text" width="60%" height={32} sx={{ mx: 'auto', mb: 1 }} />
              <Skeleton variant="text" width="90%" height={16} sx={{ mx: 'auto' }} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// Error display component
interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry, onDismiss }) => {
  const [showDetails, setShowDetails] = React.useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <Error />;
      case 'high': return <Error />;
      case 'medium': return <Warning />;
      case 'low': return <Info />;
      default: return <Info />;
    }
  };

  const getSourceIcon = (source?: string) => {
    switch (source) {
      case 'network': return <WifiOff />;
      case 'api': return <CloudOff />;
      case 'calculation': return <ErrorOutline />;
      default: return <ErrorOutline />;
    }
  };

  return (
    <Alert
      severity={getSeverityColor(error.severity) as any}
      icon={getSeverityIcon(error.severity)}
      action={
        <Box sx={{ display: 'flex', gap: 1 }}>
          {error.retryable && onRetry && (
            <Button
              color="inherit"
              size="small"
              onClick={onRetry}
              startIcon={<Refresh />}
            >
              Retry
            </Button>
          )}
          
          <IconButton
            size="small"
            onClick={() => setShowDetails(!showDetails)}
            color="inherit"
          >
            {showDetails ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      }
    >
      <AlertTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getSourceIcon(error.source)}
          {error.code}
        </Box>
      </AlertTitle>
      
      {error.message}
      
      <Collapse in={showDetails}>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Details:</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {error.details || 'No additional details available'}
          </Typography>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`Severity: ${error.severity.toUpperCase()}`}
              size="small"
              color={getSeverityColor(error.severity) as any}
            />
            <Chip
              label={`Source: ${error.source || 'unknown'}`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`Time: ${error.timestamp.toLocaleString()}`}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>
      </Collapse>
    </Alert>
  );
};

// Network status component
interface NetworkStatusProps {
  isOnline: boolean;
  lastSync?: Date;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({ isOnline, lastSync }) => {
  if (isOnline) {
    return (
      <Chip
        icon={<CheckCircle />}
        label={lastSync ? `Last sync: ${lastSync.toLocaleTimeString()}` : 'Connected'}
        color="success"
        size="small"
      />
    );
  }

  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <AlertTitle>No Internet Connection</AlertTitle>
      You're viewing cached data. Some features may be limited until connection is restored.
    </Alert>
  );
};

// Data freshness indicator
interface DataFreshnessProps {
  lastUpdated: Date;
  maxAge: number; // in minutes
}

export const DataFreshness: React.FC<DataFreshnessProps> = ({ lastUpdated, maxAge }) => {
  const now = new Date();
  const ageInMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
  
  const isStale = ageInMinutes > maxAge;
  const isWarning = ageInMinutes > maxAge * 0.8;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        icon={isStale ? <HourglassEmpty /> : <CheckCircle />}
        label={`Updated ${Math.round(ageInMinutes)}m ago`}
        color={isStale ? 'error' : isWarning ? 'warning' : 'success'}
        size="small"
      />
      
      {isStale && (
        <Typography variant="caption" color="error">
          Data may be outdated
        </Typography>
      )}
    </Box>
  );
};

// Utility function to create app errors
export const createAppError = (
  code: string,
  message: string,
  options: Partial<Omit<AppError, 'code' | 'message' | 'timestamp'>> = {}
): AppError => ({
  code,
  message,
  timestamp: new Date(),
  retryable: true,
  severity: 'medium',
  source: 'unknown',
  ...options
});

// Hook for error handling
export const useErrorHandler = () => {
  const [errors, setErrors] = React.useState<AppError[]>([]);

  const addError = React.useCallback((error: AppError) => {
    setErrors(prev => [...prev, error]);
  }, []);

  const removeError = React.useCallback((index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearErrors = React.useCallback(() => {
    setErrors([]);
  }, []);

  const handleError = React.useCallback((
    code: string,
    message: string,
    options?: Partial<Omit<AppError, 'code' | 'message' | 'timestamp'>>
  ) => {
    const error = createAppError(code, message, options);
    addError(error);
    return error;
  }, [addError]);

  return {
    errors,
    addError,
    removeError,
    clearErrors,
    handleError
  };
};

export default {
  ErrorBoundary,
  LoadingSpinner,
  ProgressLoading,
  TableSkeleton,
  CardSkeleton,
  MetricsSkeleton,
  ErrorDisplay,
  NetworkStatus,
  DataFreshness,
  useErrorHandler,
  createAppError
};