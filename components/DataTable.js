import * as React from "react";
import { Table, Thead, Tbody, Tr, Th, Td, Text, chakra } from "@chakra-ui/react";
import { TriangleDownIcon, TriangleUpIcon, SearchIcon } from "@chakra-ui/icons";
import {Pagination} from "@nextui-org/react";

// import ReactPaginate from 'react-paginate';
import {Input} from "@nextui-org/react";

import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  ColumnDef,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel
} from "@tanstack/react-table";

export function DataTable({ data, columns, page = 1, pages, setPage, pageSize = 100}) {
  const [sorting, setSorting] = React.useState([]);
  const [pageState, setPageState] = React.useState(page);
  if(!pages) {
    pages = Math.ceil(data.length/pageSize);
  }
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: setPage ? null: getPaginationRowModel(),
    //onPaginationChange: setPageState,
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
    pages = Math.ceil(table.getFilteredRowModel().rows.length/pageSize);
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
  if(!columnFilterValue) {
    return null
  }
  return typeof firstValue === 'number' ? (
    <div className="flex space-x-2">
      <Input
        value={(columnFilterValue)[0] ?? ''}
				radius="sm"
				size="sm"
				placeholder="Search..."
        onChange={e =>
          column.setFilterValue((old) => [
            e.target.value,
            old?.[1],
          ])
        }
				startContent={
				<SearchIcon color="gray.400" className="mb-0.5 dark:text-white/90 pointer-events-none flex-shrink-0" />
				}
			/>
      {/* <input
        type="number"
        value={(columnFilterValue)[0] ?? ''}
        onChange={e =>
          column.setFilterValue((old) => [
            e.target.value,
            old?.[1],
          ])
        }
        placeholder={`Min`}
        className="w-24 border shadow rounded"
      />
      <input
        type="number"
        value={(columnFilterValue)[1] ?? ''}
        onChange={e =>
          column.setFilterValue((old) => [
            old?.[0],
            e.target.value,
          ])
        }
        placeholder={`Max`}
        className="w-24 border shadow rounded"
      /> */}
    </div>
  ) : (
    <Input
        value={columnFilterValue}
				radius="sm"
				size="sm"
        onChange={e => column.setFilterValue(e.target.value)}
				placeholder="Search..."
				startContent={
				<SearchIcon color="gray.400" className="mb-0.5 dark:text-white/90 pointer-events-none flex-shrink-0" />
				}
			/>
    // <input
    //   type="text"
    //   value={(columnFilterValue ?? '')}
    //   onChange={e => column.setFilterValue(e.target.value)}
    //   placeholder={`Search...`}
    //   className="w-36 border shadow rounded"
    // />
  )
}