import React from 'react';
import { Box, Typography } from '@mui/material';

interface CandlestickChartProps {
  ticker: string;
  onClose?: () => void;
}


const CandlestickChart: React.FC<CandlestickChartProps> = ({ ticker }) => {
  return (
    <Box 
      data-ticker={ticker}
      sx={{ 
        width: 800, 
        height: 600,
        backgroundColor: 'rgba(0,0,0,0.95)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 2,
        p: 2
      }}>
      <Typography variant="h6" sx={{ 
        mb: 2, 
        textAlign: 'center', 
        color: '#00D4FF',
        fontWeight: 600 
      }}>
        {ticker} - Chart (Testing)
      </Typography>
      
      <Typography variant="body2" sx={{ color: 'white', textAlign: 'center' }}>
        Chart component loaded successfully for {ticker}
      </Typography>
    </Box>
  );
};

export default CandlestickChart;