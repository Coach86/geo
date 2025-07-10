import React from 'react';
import {
  Box,
  Pagination as MuiPagination,
  Stack,
  Typography,
  Select,
  MenuItem,
  FormControl,
  useTheme,
} from '@mui/material';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  showTotal?: boolean;
  showPageSize?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  showTotal = true,
  showPageSize = true,
}) => {
  const theme = useTheme();

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    onPageChange(value);
  };

  const handleLimitChange = (event: any) => {
    onLimitChange(Number(event.target.value));
    onPageChange(1); // Reset to first page when changing limit
  };

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        mt: 3,
        pt: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        {showTotal && (
          <Typography variant="body2" color="text.secondary">
            Showing {startItem}-{endItem} of {total} items
          </Typography>
        )}
        {showPageSize && (
          <FormControl size="small" variant="outlined">
            <Select
              value={limit}
              onChange={handleLimitChange}
              sx={{ minWidth: 80 }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
          </FormControl>
        )}
      </Stack>

      {totalPages > 1 && (
        <MuiPagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          color="primary"
          shape="rounded"
          showFirstButton
          showLastButton
        />
      )}
    </Box>
  );
};

export default Pagination;