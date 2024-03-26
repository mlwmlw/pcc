import fetch from 'node-fetch'
import React, {useState, useRef} from "react";
import {
	ChakraProvider,
	useDisclosure,	
	//Button,
	//Input,
	Flex,
	Drawer,
	DrawerBody,
	DrawerFooter,
	DrawerHeader,
	DrawerOverlay,
	DrawerContent,
	DrawerCloseButton,
} from "@chakra-ui/react"

import { SearchIcon, ChevronDownIcon } from '@chakra-ui/icons'

import {Dropdown, DropdownMenu, DropdownItem, DropdownTrigger, Navbar, NavbarBrand, NavbarMenuToggle, NavbarMenu, NavbarMenuItem, NavbarContent, Input, NavbarItem, Link, Button} from "@nextui-org/react";
  
export default function(props) {


	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const menuItems = {
		"每日標案": {'依照月份瀏覽': '/month', '招標': '/date/tender', '決標': '/date/award'},
		"相關單位": {'機關組織檢索': '/units', '廠商檢索': '/merchants', '廠商檢索依營業類型': '/merchant_type'},
		"標案統計": {'各月招標統計': '/stats','得標廠商排行': '/rank/merchant', '高額標案排行': '/rank/tender', '各單位得標廠商統計': '/rank/partner', '2019 總統候選人 政治獻金查詢': '/election'},
		"關於本站": {'關於本站': 'https://g0v.hackmd.io/1ZP3ce93RDCWQUqJewdjXA?view', '關於 g0v': 'https://g0v.tw/'}
	};
	return <Navbar height="3rem" className="bg-gray-950 text-slate-50"
	isMenuOpen={isMenuOpen}
	onMenuOpenChange={setIsMenuOpen}>
	<NavbarContent justify="start" >
	  
	  <NavbarBrand>
		<Link className="font-bold text-inherit hover:text-slate-50" href="/">
			開放標案
		</Link>
	  </NavbarBrand>
	</NavbarContent>
	<NavbarMenuToggle 
		
		aria-label={isMenuOpen ? "Close menu" : "Open menu"}
		className="sm:hidden"
	/>
	<NavbarContent className="hidden sm:flex gap-2" justify="center">
	
	  {Object.keys(menuItems).map((item, index) => (  
		<Dropdown key={`${item}-${index}`}>
			<NavbarItem>
			<DropdownTrigger>
				<Button
				disableRipple
				className="p-0 bg-transparent text-gray-400	data-[hover=true]:bg-transparent"
				radius="sm"
				variant="dark"
				endContent={<ChevronDownIcon></ChevronDownIcon>}

				>
				{item}
				</Button>
			</DropdownTrigger>
			</NavbarItem>
			<DropdownMenu
			itemClasses={{
				base: "gap-3",
			}}
			>
			{Object.keys(menuItems[item]).map((subitem, subindex) => (
				<DropdownItem
					key={subitem}
					
					href={menuItems[item][subitem]}
				>
					{subitem}
				</DropdownItem>
			))}
			
			</DropdownMenu>
		</Dropdown>
	  ))}
	
	</NavbarContent>
	<NavbarContent height="2.5rem"  justify="end" >
		<SearchDrawer keywords={props.keywords} />
	</NavbarContent>
	<NavbarMenu>
        {Object.keys(menuItems).map((item, index) => (
		  <div key={`${item}-${index}`}>
          <NavbarMenuItem>
			{item}
          </NavbarMenuItem>
		  {Object.keys(menuItems[item]).map((subitem, subindex) => (
			<NavbarMenuItem key={`${subitem}-${subindex}`} size="md">
				<Link
				className="w-full"
				color="primary"
				href={menuItems[item][subitem]}
				
				>
				{subitem}
				</Link>
          	</NavbarMenuItem>
			))}
		  </div>
        ))}
      </NavbarMenu>
  </Navbar>
}
function SearchDrawer(props) {
	const { isOpen, onOpen, onClose } = useDisclosure()
	const [value, setValue] = useState("");

	return (
		<>
			<Input
				
				onMouseDown={(e) => {
					onOpen(e)
					e.preventDefault()
				}} 
				radius="sm"
				size="sm"
				input="text-black/100"
				classNames={{
				mainWrapper: 'text-right',
				innerWrapper: [
					"bg-transparent",
				],
				input: [
					"placeholder:text-gray-100",
					"hover:placeholder:text-gray-700",
				],
				inputWrapper: [
					"shadow-xl",
					"bg-default-200/50",
					"h-full",
					
					"backdrop-blur-xl",
					"backdrop-saturate-200",
					"hover:bg-default-200/70",
					"group-data-[focused=true]:bg-default-200/50",
					"dark:group-data-[focused=true]:bg-default/60",
					"!cursor-text",
				],
				}}
				placeholder="搜尋標案..."
				startContent={
				<SearchIcon color="gray.400" className="mb-0.5 dark:text-white/90 pointer-events-none flex-shrink-0" />
				}
			/>
			{/* <input data-toggle="collapse" data-target=".navbar-collapse" inputMode="search" type="search" ng-model="keyword" className="form-control search" placeholder="標案搜尋（名稱、機構、廠商）" onClick={onOpen} />
			<Button color="primary">
				<span className="glyphicon glyphicon-search"></span>
			</Button> */}
			<Drawer
				isOpen={isOpen}
				placement="top"
				onClose={onClose}
			>
				<DrawerOverlay />
				<DrawerContent >
					<DrawerHeader>搜尋</DrawerHeader>

					<DrawerBody>

						<form onSubmit={(e) => {
							fetch('/api/keyword/' + value, {
								method: 'post'
							}).then(function () {
								location.href = "/search/" + value
							})
							e.preventDefault();
						}} style={{ margin: "0px 30px" }} ng-submit="search(keyword)">
							<div style={{ width: "100%" }} className="input-group row">
								<div className="form-outline">
									<Input								
										radius="sm"
										size="sm"
										classNames={{
											inputWrapper: ["h-12"]
										}}
										placeholder="標案搜尋（名稱、機構、廠商）"
										startContent={
										<SearchIcon className="text-black/50 mb-0.5 dark:text-white/90 text-slate-400 pointer-events-none flex-shrink-0" />
										}
										onValueChange={setValue}
									></Input>
									{/* <input ref={inputRef} inputMode="search" type="search" style={{ width: "20em" }} ng-model="keyword" className="form-control search" placeholder="標案搜尋（名稱、機構、廠商）" /> */}
								</div>
								{/* <Button color="primary">
									<span className="glyphicon glyphicon-search"></span>
								</Button> */}
							</div>
							<div className="keywords row">
								<br />
								<div>熱門關鍵字</div>
								<ul>
									{props.keywords.map((keyword, i) => <li key={i}>
										<a onClick={(e) => {
											fetch('/api/keyword/' + keyword, {
												method: 'post'
											}).then(function () {
												location.href = "/search/" + keyword
											})
										}} >{keyword}</a>
									</li>)}
								</ul>
							</div>
						</form>

					</DrawerBody>
				</DrawerContent>
			</Drawer>
		</>
	)
}
