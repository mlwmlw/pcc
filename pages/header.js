const fetch = require("node-fetch");
import React from "react";
import App, {useState, useEffect} from 'next/app'
import {
	ChakraProvider, 
	useDisclosure,
  Button,
  Input,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
} from "@chakra-ui/react"

function SearchDrawer(props) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const btnRef = React.useRef()

	return (
    <>
			<input data-toggle="collapse" data-target=".navbar-collapse" inputMode="search" type="search" ng-model="keyword" className="form-control search" placeholder="標案搜尋（名稱、機構、廠商）" onClick={onOpen}/>
			<button type="submit" className="btn btn-primary">
				<span className="glyphicon glyphicon-search"></span>
			</button>
      <Drawer
        isOpen={isOpen}
        placement="top"
        onClose={onClose}
        finalFocusRef={btnRef}
      >
        <DrawerOverlay />
        <DrawerContent >
          <DrawerHeader>搜尋</DrawerHeader>

          <DrawerBody>

						<form style={{margin: "0px 30px"}} ng-submit="search(keyword)">
							<div style={{width: "100%"}} className="input-group row">
								<div className="form-outline">
									<input inputMode="search" type="search" style={{width:"20em"}} ng-model="keyword" className="form-control search" placeholder="標案搜尋（名稱、機構、廠商）" />
								</div>
								<button  type="submit" className="btn btn-primary">
									<span className="glyphicon glyphicon-search"></span>
								</button>
							</div>
							<div className="keywords row">
								<br />
								<div>熱門關鍵字</div>
								<ul>
										{props.keywords.map( keyword => <li key={keyword}>
											<a ng-click={"search('"+keyword+"')"} style={{padding: "2px 3px", cursor:"pointer", float:"left", display: "inline-block", marginLeft: "5px"}}>{keyword}</a>
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



export default class extends React.Component {
	constructor(props) {
		super(props);
	}
  
  render() {
		return <div className="navbar navbar-inverse navbar-fixed-top" role="navigation">
			<div className="container">
				<div className="navbar-header">
						<button type="button" className="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
							<span className="sr-only">Toggle navigation</span>
							<span className="icon-bar"></span>
							<span className="icon-bar"></span>
							<span className="icon-bar"></span>
						</button>
						<a style={{color:"white"}} className="navbar-brand" href="/">開放標案</a>
				</div>
				<div className="collapse navbar-collapse">
					<ul className="nav navbar-nav">
							<li className="dropdown"><a className="dropdown-toggle" href="javascript:void(0)">每日標案<span className="caret"></span></a>
									<ul className="dropdown-menu" role="menu">
											<li><a href="/month">依月份瀏覽</a></li>
											<li><a href="/date/tender">招標</a></li>
											<li><a href="/date/award">決標</a></li>
									</ul>
							</li>

							<li className="dropdown"><a className="dropdown-toggle" href="javascript:void(0)">相關單位<span className="caret"></span></a>
									<ul className="dropdown-menu" role="menu">
											<li><a href="/units">機關組織檢索</a></li>
											<li><a href="/merchants">廠商檢索</a></li>
											<li><a href="/merchant_type">廠商檢索依營業類型</a></li>
									</ul>
							</li>
							<li className="dropdown"><a className="dropdown-toggle" href="javascript:void(0)">統計<span className="caret"></span></a>
									<ul className="dropdown-menu" role="menu">
											<li><a href="/stats">各月招標統計</a></li>
											<li><a href="/rank/merchant">得標廠商排行</a></li>
											<li><a href="/rank/tender">高額標案排行</a></li>
											<li><a href="/rank/partner">各單位得標廠商統計</a></li>
											<li><a href="/election">2019 總統候選人 政治獻金查詢</a></li>
									</ul>
							</li>
							<li className="dropdown"><a className="dropdown-toggle" href="javascript:void(0)">關於<span className="caret"></span></a>
									<ul className="dropdown-menu" role="menu">
											<li><a href="/hackpad">關於</a></li>
											<li><a target="_blank" href="https://g0v.hackpad.com/LV55tyn5uYK">g0v</a></li>
									</ul>
							</li>
					</ul>

					<form className="navbar-form navbar-right" ng-submit="search(keyword)">
						<SearchDrawer keywords={this.props.keywords} />
					</form>
					<div style={{display: "none"}} id="keywords" className="navbar-form navbar-right">
							<span>熱門關鍵字：</span>
							<ul>
									{this.props.keywords.map( keyword => <li key={keyword}>
										<a ng-click={"search('"+keyword+"')"} style={{cursor:"pointer"}}>{keyword}</a>
									</li>)}
							</ul>
					</div>
			</div>
					
			</div>
		</div> 
  }
}
