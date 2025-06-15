import * as React from "react";
import { Table, Thead, Tbody, Tr, Th, Td, Text, chakra } from "@chakra-ui/react";
import { TriangleDownIcon, TriangleUpIcon, SearchIcon } from "@chakra-ui/icons";
import {Pagination} from "@nextui-org/react";
import {Input} from "@nextui-org/react";

import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel
} from "@tanstack/react-table";

export function DataTable({ data, columns, page = 1, pages, setPage, pageSize = 100}) {
  const [sorting, setSorting] = React.useState([]);
  const [pageState, setPageState] = React.useState(page);

  React.useEffect(() => {
    setPageState(page);
  }, [page]);

  const totalPages = React.useMemo(() => {
    return pages || Math.ceil(data.length/pageSize);
  }, [data.length, pages, pageSize]);

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: setPage ? null : getPaginationRowModel(),
    state: {
      sorting,
      pagination: {
        pageSize: pageSize,
        pageIndex: pageState - 1,
      },
    }
  });

  const handlePageChange = React.useCallback((p) => {
    if (setPage) {
      setPage(p);
    } else {
      table.setPageIndex(p-1);
      setPageState(p);
    }
  }, [setPage, table]);

  function CustomPagination() {
    const currentPages = React.useMemo(() => {
      if (setPage) return totalPages;
      return Math.ceil(table.getFilteredRowModel().rows.length/pageSize);
    }, [table, totalPages]);

    if (!currentPages || currentPages <= 0 || currentPages === 1) return null;

    return (
      <div className="my-5 flex gap-4">
        <Pagination 
          onChange={handlePageChange} 
          className="mx-auto" 
          size="lg" 
          variant="flat" 
          showControls 
          total={currentPages} 
          page={pageState}
          initialPage={page}
        />
      </div>
    );
  }

  return (
    <div className="mb-10">
      <CustomPagination /> 
      <Table size='lg' variant='striped' colorScheme='gray' className="mx-auto">
        <Thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <Tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta;
                return (
                  <Th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    isNumeric={meta?.isNumeric}
                    py={2} px={2}
                  >
                    <Text fontSize='lg'>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() ? (
                        header.column.getIsSorted() === "desc" ? (
                          <TriangleDownIcon aria-label="sorted descending" />
                        ) : (
                          <TriangleUpIcon aria-label="sorted ascending" />
                        )
                      ) : null}
                    </Text>
                    {header.column.getCanFilter() ? (
                      <div>
                        <Filter column={header.column} table={table} />
                      </div>
                    ) : null}
                  </Th>
                );
              })}
            </Tr>
          ))}
        </Thead>
        <Tbody>
          {table.getRowModel().rows.map((row) => (
            <Tr key={row.id}>
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta;
                return (
                  <Td key={cell.id} isNumeric={meta?.isNumeric} py={1} px={2}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Td>
                );
              })}
            </Tr>
          ))}
        </Tbody>
      </Table>
      <CustomPagination /> 
    </div>
  );
}

function Filter({column, table}) {
  const firstValue = table
    .getPreFilteredRowModel()
    .flatRows[0]?.getValue(column.id)
  const columnFilterValue = column.getFilterValue()
  
  if (!columnFilterValue) {
    return null;
  }

  const filterProps = {
    radius: "sm",
    size: "sm",
    placeholder: "Search...",
    startContent: (
      <SearchIcon color="gray.400" className="mb-0.5 dark:text-white/90 pointer-events-none flex-shrink-0" />
    )
  };

  if (typeof firstValue === 'number') {
    return (
      <div className="flex space-x-2">
        <Input
          {...filterProps}
          value={(columnFilterValue)[0] ?? ''}
          onChange={e =>
            column.setFilterValue((old) => [
              e.target.value,
              old?.[1],
            ])
          }
        />
      </div>
    );
  }

  return (
    <Input
      {...filterProps}
      value={columnFilterValue}
      onChange={e => column.setFilterValue(e.target.value)}
    />
  );
}
