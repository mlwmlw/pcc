import * as React from "react";
import { Table, Thead, Tbody, Tr, Th, Td, Text, chakra } from "@chakra-ui/react";
import { TriangleDownIcon, TriangleUpIcon } from "@chakra-ui/icons";
import {Pagination} from "@nextui-org/react";
import ReactPaginate from 'react-paginate';

import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  ColumnDef,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel
} from "@tanstack/react-table";

export function DataTable({ data, columns, page = 1, pages, setPage, pageSize = 100}) {
  const [sorting, setSorting] = React.useState([]);
  const [pageState, setPageState] = React.useState(page);
  if(!pages) {
    pages = Math.floor(data.length/pageSize);
  }
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: setPage ? null: getPaginationRowModel(),
    state: {
      sorting,
      pagination: {
        pageSize: pageSize,
        pageIndex: pageState - 1,
      },
    }
  });
  function CustomPagination() {
    if(setPage) {
      return <div className="my-5 flex gap-4">
        <Pagination onChange={setPage} className="mx-auto" size="lg" variant="flat" showControls total={pages} initialPage={page} />
      </div>
    }
    if(pages > 0) {
      return <div className="my-5 flex gap-4">
        <Pagination onChange={(p) => {
            table.setPageIndex(p)
            setPageState(p)
        }} className="mx-auto" size="lg" variant="flat" showControls total={pages} initialPage={table.getState().pagination.pageIndex + 1} />
      </div>
    }
  }
  return (<div className="mb-10">
    {/* {JSON.stringify({pagination:table.getState().pagination, length: data.length}, null, 2)} */}
    <CustomPagination /> 
    <Table size='lg' variant='striped' colorScheme='gray' className="mx-auto">
      <Thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <Tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              // see https://tanstack.com/table/v8/docs/api/core/column-def#meta to type this correctly
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
